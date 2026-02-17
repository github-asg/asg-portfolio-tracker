; Custom NSIS installer script for Stock Portfolio Manager

; Add custom pages or modifications here
; This file is included in the NSIS installer build process

; Example: Add a custom finish page message
!macro customFinishPageAction
  MessageBox MB_OK "Stock Portfolio Manager has been installed successfully!$\r$\n$\r$\nPlease ensure you have ICICI Breeze API credentials ready for setup."
!macroend

; Example: Add registry entries for file associations
!macro customInstall
  ; Add any custom installation steps here
!macroend

; Example: Clean up custom registry entries
!macro customUnInstall
  ; Add any custom uninstallation steps here
!macroend