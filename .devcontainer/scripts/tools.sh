#!/bin/bash

mkdir -p ~/.ssh && \
  touch ~/.ssh/known_hosts && \
  sudo tee ~/.ssh/config > /dev/null << EOF 
Host github.com
  HostName github.com
  PreferredAuthentications publickey
  IdentityFile ~/.hostssh/id_rsa.pub
EOF

sudo chown -R vscode:vscode ~/.ssh && \
  sudo chmod 600 ~/.ssh/config && \
  sudo chmod 600 ~/.ssh/known_hosts

git config --global --add safe.directory ${PWD}

asdf install nodejs 18.20.4
asdf global nodejs 18.20.4