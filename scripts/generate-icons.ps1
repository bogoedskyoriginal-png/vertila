param(
  [Parameter(Mandatory=$true)]
  [string]$InputPath,
  [string]$OutDir = "public/icons"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $InputPath)) {
  throw "InputPath not found: $InputPath"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Save-ResizedPng([System.Drawing.Image]$src, [int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  # Cover crop (center)
  $srcW = [double]$src.Width
  $srcH = [double]$src.Height
  $dstF = New-Object System.Drawing.RectangleF 0, 0, $size, $size

  $scale = [Math]::Max($size / $srcW, $size / $srcH)
  $cropW = $size / $scale
  $cropH = $size / $scale
  $cropX = ($srcW - $cropW) / 2
  $cropY = ($srcH - $cropH) / 2
  $srcRect = New-Object System.Drawing.RectangleF([float]$cropX, [float]$cropY, [float]$cropW, [float]$cropH)

  # Use RectangleF overload explicitly (prevents PS from picking Rectangle overload)
  $g.DrawImage($src, $dstF, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Save-Maskable512([System.Drawing.Image]$src, [string]$outPath) {
  $size = 512
  $pad = 64 # safe padding
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $dstF = New-Object System.Drawing.RectangleF $pad, $pad, ($size - 2*$pad), ($size - 2*$pad)

  $srcW = [double]$src.Width
  $srcH = [double]$src.Height
  $scale = [Math]::Max($dstF.Width / $srcW, $dstF.Height / $srcH)
  $cropW = $dstF.Width / $scale
  $cropH = $dstF.Height / $scale
  $cropX = ($srcW - $cropW) / 2
  $cropY = ($srcH - $cropH) / 2
  $srcRect = New-Object System.Drawing.RectangleF([float]$cropX, [float]$cropY, [float]$cropW, [float]$cropH)

  $g.DrawImage($src, $dstF, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$img = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $InputPath))

Save-ResizedPng $img 192 (Join-Path $OutDir "icon-192.png")
Save-ResizedPng $img 512 (Join-Path $OutDir "icon-512.png")
Save-ResizedPng $img 180 (Join-Path $OutDir "apple-touch-icon.png")
Save-Maskable512 $img (Join-Path $OutDir "icon-512-maskable.png")

$img.Dispose()

Write-Host "Generated icons in $OutDir"
