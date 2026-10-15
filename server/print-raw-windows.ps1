param (
    [Parameter(Mandatory=$true)]
    [string]$filePath,
    [Parameter(Mandatory=$false)]
    [string]$printerName = ""
)

$ErrorActionPreference = "Stop"

try {
    # 1. Se o nome da impressora nao foi passado, descobre a impressora padrao do Windows
    if ([string]::IsNullOrWhiteSpace($printerName)) {
        try {
            $defaultPrinterObj = Get-CimInstance -ClassName Win32_Printer -Filter "Default = TRUE" -ErrorAction SilentlyContinue
            if ($defaultPrinterObj) {
                $printerName = $defaultPrinterObj.Name
            }
        } catch {}

        if ([string]::IsNullOrWhiteSpace($printerName)) {
            try {
                $defaultPrinterObj = Get-WmiObject -Query "SELECT Name FROM Win32_Printer WHERE Default = TRUE" -ErrorAction SilentlyContinue
                if ($defaultPrinterObj) {
                    $printerName = $defaultPrinterObj.Name
                }
            } catch {}
        }

        if ([string]::IsNullOrWhiteSpace($printerName)) {
            $firstPrinter = Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($firstPrinter) {
                $printerName = $firstPrinter.Name
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($printerName)) {
        throw "Nenhuma impressora configurada no Windows. Conecte uma impressora e defina-a como padrao."
    }

    if (-not (Test-Path $filePath)) {
        throw "Arquivo temporario de impressao nao encontrado: $filePath"
    }

    # 2. Compila a classe C# RawPrinterHelper que acessa a Win32 API winspool.drv diretamente
    $rawPrinterType = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
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

    public static bool SendFileToPrinter(string szPrinterName, string szFileName) {
        if (!File.Exists(szFileName)) return false;
        FileStream fs = new FileStream(szFileName, FileMode.Open, FileAccess.Read, FileShare.Read);
        BinaryReader br = new BinaryReader(fs);
        Byte[] bytes = br.ReadBytes((int)fs.Length);
        fs.Close();

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "SDG_Delivery_Ticket";
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

    if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
        Add-Type -TypeDefinition $rawPrinterType -Language CSharp
    }

    $success = [RawPrinterHelper]::SendFileToPrinter($printerName, $filePath)

    if (-not $success) {
        # Fallback: tenta enviar via Out-Printer do PowerShell
        try {
            Get-Content -Raw -Encoding Default -Path $filePath | Out-Printer -Name $printerName
            $success = $true
        } catch {
            throw "Falha ao enviar arquivo para o spooler da impressora '$printerName'."
        }
    }

    $result = @{
        success = $true
        printer = $printerName
        message = "Cupom impresso com sucesso na impressora padrao '$printerName'!"
    }
    $result | ConvertTo-Json -Compress
} catch {
    $errResult = @{
        success = $false
        error = $_.Exception.Message
    }
    $errResult | ConvertTo-Json -Compress
    exit 1
}
