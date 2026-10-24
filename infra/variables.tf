variable "github_repository" {
  description = "The repository allowed to publish, as owner/name."
  type        = string
  default     = "Joniba1/tab-renamer"
}

variable "workflow_path" {
  description = "The workflow file allowed to publish, relative to the repository root."
  type        = string
  default     = ".github/workflows/publish-extension.yml"
}
