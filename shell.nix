{pkgs ? import <nixpkgs> {}}:
pkgs.mkShell {
  packages = with pkgs; [nodejs_24 python3 pkg-config gnumake gcc chromium];

  shellHook = ''
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
  '';
}
