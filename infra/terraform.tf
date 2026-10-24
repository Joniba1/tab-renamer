terraform {
  required_version = ">= 1.5"

  # State is stored in HCP Terraform; runs stay local.
  cloud {
    organization = "personal-lab-79"

    workspaces {
      name = "tab-renamer"
    }
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.0"
    }
  }
}

provider "google" {
  project = local.project_id
}
