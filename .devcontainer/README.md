# Dev Container for Tractive CLI

This directory contains the configuration for a development container that can be used with Visual Studio Code.

## What is a Dev Container?

A development container (or dev container for short) allows you to use a container as a full-featured development environment. This ensures that all developers working on the project have the same development environment, regardless of their local setup.

## Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for VS Code

## How to Use

1. Install the prerequisites listed above
2. Open this repository in VS Code
3. When prompted, click "Reopen in Container" or use the command palette (F1) and select "Dev Containers: Reopen in Container"
4. VS Code will build the container and install all dependencies automatically

## What's Included

The dev container includes:

- **Python 3.11** runtime
- **Git** for version control
- **All project dependencies** (automatically installed via `pip install -r requirements.txt`)
- **VS Code Extensions:**
  - Python (Microsoft)
  - Pylance (fast Python language server)
  - Black Formatter (code formatting)
  - Flake8 (linting)
  - isort (import sorting)

## Configuration

The container is configured with:

- Automatic dependency installation on container creation
- Python set as the default interpreter
- Code formatting on save (using Black)
- Import organization on save (using isort)
- Flake8 linting enabled

## Development Workflow

Once the container is running:

1. All Python dependencies are already installed
2. The CLI is installed in development mode (`pip install -e .`)
3. You can run commands directly:
   ```bash
   ./tractive-cli --help
   ```

## Troubleshooting

- If the container fails to build, try rebuilding it: Command Palette (F1) → "Dev Containers: Rebuild Container"
- If dependencies aren't installed, manually run: `pip install -r requirements.txt && pip install -e .`
