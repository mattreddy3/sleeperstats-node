# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.194.0/containers/typescript-node/.devcontainer/base.Dockerfile

# [Choice] Node.js version: 16, 14, 12
ARG VARIANT="16-bullseye"
# FROM mcr.microsoft.com/vscode/devcontainers/typescript-node:0-${VARIANT}
FROM arm64v8/node:${VARIANT}

ARG USERNAME=node

# RUN mkdir -p /home/$USERNAME/.vscode-server/extensions \
#     /home/$USERNAME/.vscode-server-insiders/extensions \
#     && chown -R $USERNAME \
#     /home/$USERNAME/.vscode-server \
#     /home/$USERNAME/.vscode-server-insiders 

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node packages
RUN npm install -g typescript @openai/codex
