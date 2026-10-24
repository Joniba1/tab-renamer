# The values for the GCP_WORKLOAD_IDENTITY_PROVIDER and CWS_SERVICE_ACCOUNT GitHub variables.

output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "service_account" {
  description = "Add this email in the Chrome Web Store dashboard, under Account."
  value       = google_service_account.publisher.email
}
