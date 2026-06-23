$edgeCandidates = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ }

$indexPath = Join-Path $PSScriptRoot "index.html"
if (-not (Test-Path $indexPath)) {
  throw "Could not find index.html in $PSScriptRoot"
}

$appUrl = [System.Uri]::new($indexPath).AbsoluteUri

if ($edgeCandidates.Count -gt 0) {
  Start-Process -FilePath $edgeCandidates[0] -ArgumentList "--app=$appUrl"
  exit 0
}

Start-Process -FilePath $indexPath
