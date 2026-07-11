# Security policy

## Supported versions

Security fixes are provided for the latest released minor version.

## Reporting a vulnerability

Do not open a public issue for vulnerabilities involving arbitrary file access, path traversal, command execution, or credential exposure. Use GitHub's private vulnerability reporting feature after the repository is published.

Agent Context Lens is read-only by design. It does not execute commands found in instruction files and does not upload repository content. Treat generated reports as sensitive because instruction files may contain internal architecture or accidental credentials.
