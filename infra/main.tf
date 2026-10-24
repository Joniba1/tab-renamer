resource "google_project_service" "apis" {
  for_each = toset([
    "chromewebstore.googleapis.com", # the Chrome Web Store API
    "iam.googleapis.com",            # service accounts and identity pools
    "iamcredentials.googleapis.com", # short-lived tokens for the service account
    "sts.googleapis.com",            # exchanges GitHub's identity token
  ])

  service            = each.value
  disable_on_destroy = false
}

resource "google_service_account" "publisher" {
  account_id   = "tab-renamer-publisher"
  display_name = "Tab Renamer publisher"
  description  = "Publishes Tab Renamer to the Chrome Web Store from GitHub Actions."

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "tab-renamer"
  display_name              = "Tab Renamer"
  description               = "GitHub Actions runs that publish Tab Renamer."

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub releases"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = join(" && ", [
    "assertion.repository == '${var.github_repository}'",
    "assertion.job_workflow_ref.startsWith('${var.github_repository}/${var.workflow_path}@')",
    "assertion.event_name == 'release'",
  ])

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github" {
  service_account_id = google_service_account.publisher.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
