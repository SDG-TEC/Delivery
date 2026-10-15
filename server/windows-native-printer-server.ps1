# ==============================================================================
# SDG Delivery - Servidor Nativo de Impressão Windows (Porta 3001)
# 100% Nativo Windows: Sem dependência de Node.js, Python ou bibliotecas externas!
# Roda em qualquer máquina Windows 10 / 11 apenas com o PowerShell.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue

# 1. Carrega classe Win32 Spooler para envio RAW ESC/POS em memória
$rawSpoolerCode = @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Drawing.Printing;

public class NativeSpoolerHelper {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytes(string szPrinterName, byte[] bytes) {
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "SDG_Delivery_Cupom";
        di.pDataType = "RAW";
        bool bSuccess = false;

        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }
}
"@

try {
    Add-Type -TypeDefinition $rawSpoolerCode -Language CSharp -ErrorAction SilentlyContinue
} catch {}

# 2. Inicia Servidor HTTP na porta 3001
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:3001/")
$listener.Prefixes.Add("http://127.0.0.1:3001/")

try {
    $listener.Start()
} catch {
    Write-Host "Erro ao abrir porta 3001: $_"
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SDG DELIVERY - SERVIDOR NATIVO DE IMPRESSAO WINDOWS ATIVO" -ForegroundColor Green
Write-Host "  Porta: 3001 (http://localhost:3001)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan

function CleanEscposCodes($txt) {
    if (-not $txt) { return "" }
    $s = [string]$txt
    $s = $s -replace '\x1B[@!a-z0-9\-\(\)]', ''
    $s = $s -replace '\x1D[a-z0-9\-\(\)]', ''
    $s = $s -replace '[\x00-\x09\x0B\x0C\x0E-\x1F]', ''
    return $s.Trim()
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Headers CORS essenciais para permitir chamada de delivery.sdgtec.com.br (HTTPS)
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, *")
        $response.Headers.Add("Access-Control-Allow-Private-Network", "true")

        $urlPath = $request.Url.AbsolutePath.ToLower()
        if ($urlPath.StartsWith("/api/printer")) {
            $urlPath = $urlPath.Substring(12)
            if (-not $urlPath.StartsWith("/")) { $urlPath = "/" + $urlPath }
        }

        # Trata OPTIONS preflight
        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        # Rota 1: Status
        if ($urlPath -eq "/" -or $urlPath -eq "/status") {
            $respObj = @{
                success = $true
                online = $true
                message = "Servidor SDG Printer Ativo na porta 3001"
            }
            $jsonStr = $respObj | ConvertTo-Json -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Rota 2: Listar Impressoras Instaladas
        if ($urlPath -eq "/list" -or $urlPath -eq "/printers") {
            $printerList = [System.Collections.ArrayList]::new()
            try {
                $installed = [System.Drawing.Printing.PrinterSettings]::InstalledPrinters
                foreach ($p in $installed) {
                    [void]$printerList.Add($p)
                }
            } catch {}

            $defaultPrinter = ""
            try {
                $defaultPrinter = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName
            } catch {}

            $respObj = @{
                success = $true
                printers = $printerList
                defaultPrinter = $defaultPrinter
                networkPrinters = @()
            }
            $jsonStr = $respObj | ConvertTo-Json -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Rota 3: Imprimir Cupom
        if ($urlPath -eq "/print" -and $request.HttpMethod -eq "POST") {
            $bodyText = ""
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
            } catch {}

            $body = $null
            try { $body = $bodyText | ConvertFrom-Json } catch {}

            $printerName = ""
            if ($body -and $body.printerName) { $printerName = [string]$body.printerName }
            if ([string]::IsNullOrWhiteSpace($printerName)) {
                try { $printerName = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName } catch {}
            }

            $rawPayload = ""
            if ($body -and $body.tickets -and $body.tickets.Count -gt 0) {
                foreach ($t in $body.tickets) {
                    if ($t -is [string]) { $rawPayload += $t }
                    elseif ($t.rawEscpos) { $rawPayload += $t.rawEscpos }
                }
            } elseif ($body -and $body.rawEscpos) {
                $rawPayload = [string]$body.rawEscpos
            }

            $isOffice = $false
            if ($body -and $body.isOffice -ne $null) {
                $isOffice = [bool]$body.isOffice
            } else {
                $n = $printerName.ToLower()
                if ($n -like "*l3250*" -or $n -like "*ecotank*" -or $n -like "*deskjet*" -or $n -like "*laserjet*" -or $n -like "*pdf*") {
                    $isOffice = $true
                }
            }

            $success = $false
            if ($isOffice) {
                # Impressão formatada para impressoras convencionais de escritório (A4/Carta)
                $cleanText = CleanEscposCodes $rawPayload
                try {
                    $cleanText | Out-Printer -Name $printerName
                    $success = $true
                } catch {
                    $success = $false
                }
            } else {
                # Impressão RAW direta para impressoras térmicas (Elgin, Epson, POS-80, etc.)
                $bytes = [System.Text.Encoding]::GetEncoding("latin1").GetBytes($rawPayload)
                $success = [NativeSpoolerHelper]::SendBytes($printerName, $bytes)
                if (-not $success) {
                    # Fallback via Out-Printer
                    try {
                        (CleanEscposCodes $rawPayload) | Out-Printer -Name $printerName
                        $success = $true
                    } catch {}
                }
            }

            $respObj = @{
                success = $success
                printer = $printerName
                via = "windows_native_spooler"
                message = if ($success) { "Cupom impresso na impressora '$printerName'!" } else { "Falha ao enviar para '$printerName'." }
            }
            $jsonStr = $respObj | ConvertTo-Json -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Rota 4: Teste de Impressão
        if ($urlPath -eq "/test" -and $request.HttpMethod -eq "POST") {
            $bodyText = ""
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $bodyText = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
            $body = $null
            try { $body = $bodyText | ConvertFrom-Json } catch {}

            $printerName = ""
            if ($body -and $body.printerName) { $printerName = [string]$body.printerName }
            if ([string]::IsNullOrWhiteSpace($printerName)) {
                try { $printerName = (New-Object System.Drawing.Printing.PrinterSettings).PrinterName } catch {}
            }

            $testSlip = @"
====================================================
                 SDG RESTAURANTE
====================================================
TESTE DE IMPRESSAO DIRETA (WINDOWS NATIVO)
IMPRESSORA: $printerName
DATA/HORA:  $((Get-Date).ToString("dd/MM/yyyy HH:mm:ss"))
STATUS:     COMUNICACAO 100% OPERACIONAL
SISTEMA:    SDG Delivery (delivery.sdgtec.com.br)
====================================================
Este teste confirma que sua impressora esta conectada
e configurada com sucesso para impressao direta!
====================================================


"@
            $bytes = [System.Text.Encoding]::GetEncoding("latin1").GetBytes($testSlip)
            $success = [NativeSpoolerHelper]::SendBytes($printerName, $bytes)
            if (-not $success) {
                try {
                    $testSlip | Out-Printer -Name $printerName
                    $success = $true
                } catch {}
            }

            $respObj = @{
                success = $success
                printer = $printerName
                message = "Teste impresso com sucesso na impressora '$printerName'!"
            }
            $jsonStr = $respObj | ConvertTo-Json -Compress
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $response.ContentType = "application/json; charset=utf-8"
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Outras rotas -> 404
        $response.StatusCode = 404
        $response.Close()
    } catch {
        # Loop resiliente
    }
}
