<#
  1909년 원본 RWS 카드 스캔 78장을 위키미디어 공용에서 assets\cards\로 내려받는다.
  Windows PowerShell용. 리눅스/맥은 tools/fetch-cards.sh를 쓴다.

  사용법:
      powershell -ExecutionPolicy Bypass -File tools\fetch-cards.ps1
      powershell -ExecutionPolicy Bypass -File tools\fetch-cards.ps1 -Width 1000

  한 번만 실행하고 assets\cards\ 를 커밋하면, 배포된 사이트는 외부 요청 없이 동작한다.

  받아온 이미지는 퍼블릭 도메인이다 (Pamela Colman Smith, 1909).
  미국은 1909년 발행 후 저작권 미갱신, 영국/EU는 2022-01-01부터 보호 만료.
#>

param(
    [int]$Width = 800
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # 없으면 다운로드가 크게 느려진다

$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root 'assets\cards'
$base = 'https://commons.wikimedia.org/wiki/Special:FilePath'
$ua   = 'tarot-site-image-fetch/1.0'

New-Item -ItemType Directory -Force -Path $out | Out-Null

$major = @(
    'RWS_Tarot_00_Fool.jpg',             'RWS_Tarot_01_Magician.jpg',
    'RWS_Tarot_02_High_Priestess.jpg',   'RWS_Tarot_03_Empress.jpg',
    'RWS_Tarot_04_Emperor.jpg',          'RWS_Tarot_05_Hierophant.jpg',
    'RWS_Tarot_06_Lovers.jpg',           'RWS_Tarot_07_Chariot.jpg',
    'RWS_Tarot_08_Strength.jpg',         'RWS_Tarot_09_Hermit.jpg',
    'RWS_Tarot_10_Wheel_of_Fortune.jpg', 'RWS_Tarot_11_Justice.jpg',
    'RWS_Tarot_12_Hanged_Man.jpg',       'RWS_Tarot_13_Death.jpg',
    'RWS_Tarot_14_Temperance.jpg',       'RWS_Tarot_15_Devil.jpg',
    'RWS_Tarot_16_Tower.jpg',            'RWS_Tarot_17_Star.jpg',
    'RWS_Tarot_18_Moon.jpg',             'RWS_Tarot_19_Sun.jpg',
    'RWS_Tarot_20_Judgement.jpg',        'RWS_Tarot_21_World.jpg'
)

$files = [System.Collections.Generic.List[string]]::new()
$major | ForEach-Object { $files.Add($_) }
foreach ($suit in @('Wands', 'Cups', 'Swords', 'Pents')) {
    1..14 | ForEach-Object { $files.Add(('{0}{1:D2}.jpg' -f $suit, $_)) }
}

Write-Host ("총 {0}장 - 가로 {1}px - 저장 위치: {2}" -f $files.Count, $Width, $out)
Write-Host ''

$ok = 0; $skip = 0; $fail = 0
$failed = [System.Collections.Generic.List[string]]::new()

foreach ($f in $files) {
    $dest = Join-Path $out $f

    if ((Test-Path $dest) -and (Get-Item $dest).Length -gt 0) {
        Write-Host ("  . {0,-34} 이미 있음" -f $f)
        $skip++
        continue
    }

    $uri = '{0}/{1}?width={2}' -f $base, $f, $Width

    try {
        Invoke-WebRequest -Uri $uri `
                          -OutFile $dest `
                          -UserAgent $ua `
                          -TimeoutSec 60 `
                          -MaximumRedirection 5
        $kb = [math]::Round((Get-Item $dest).Length / 1KB)
        Write-Host ("  O {0,-34} {1} KB" -f $f, $kb) -ForegroundColor Green
        $ok++
    }
    catch {
        if (Test-Path $dest) { Remove-Item $dest -Force }
        Write-Host ("  X {0,-34} {1}" -f $f, $_.Exception.Message) -ForegroundColor Red
        $fail++
        $failed.Add($f)
    }

    Start-Sleep -Milliseconds 300   # 공용 서버에 대한 예의
}

Write-Host ''
Write-Host ("받음 {0} / 건너뜀 {1} / 실패 {2}" -f $ok, $skip, $fail)

if ($fail -gt 0) {
    Write-Host ''
    Write-Host '실패 목록:' -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  $_" }
    Write-Host ''
    Write-Host '실패한 카드는 사이트에서 자동으로 기하 심볼 SVG로 대체되므로'
    Write-Host '배포 자체에는 문제가 없다. 파일명을 확인하려면:'
    Write-Host '  https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck'
    exit 1
}

Write-Host ''
Write-Host ' 완료. assets\cards\ 를 커밋하면 배포 사이트가 로컬 이미지를 사용한다.' -ForegroundColor Green
