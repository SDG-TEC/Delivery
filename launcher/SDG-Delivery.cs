using System;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Printing;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Reflection;
using Microsoft.Win32;

[assembly: AssemblyTitle("SDG Delivery")]
[assembly: AssemblyDescription("Launcher Quiosque e Servidor de Impressão Direta SDG Delivery")]
[assembly: AssemblyProduct("SDG Delivery & KDS")]
[assembly: AssemblyCompany("SDG TEC")]
[assembly: AssemblyCopyright("Copyright © SDG TEC 2026")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace SdgDeliveryLauncher {

    // =========================================================================
    // 🖨️ RawPrinterHelper: Win32 Spooler API (winspool.drv) para ESC/POS direto
    // =========================================================================
    public static class RawPrinterHelper {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
        }

        [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

        public static string ResolveInstalledPrinter(string requestedName) {
            if (string.IsNullOrEmpty(requestedName)) {
                try {
                    return new PrinterSettings().PrinterName ?? "";
                } catch {
                    return "";
                }
            }

            foreach (string p in PrinterSettings.InstalledPrinters) {
                if (string.Equals(p, requestedName, StringComparison.OrdinalIgnoreCase)) {
                    return p;
                }
            }

            string reqLower = requestedName.Trim().ToLowerInvariant();
            foreach (string p in PrinterSettings.InstalledPrinters) {
                if (p.ToLowerInvariant().Contains(reqLower) || reqLower.Contains(p.ToLowerInvariant())) {
                    return p;
                }
            }

            return requestedName;
        }

        public static bool SendBytes(string szPrinterName, byte[] bytes) {
            if (string.IsNullOrEmpty(szPrinterName) || bytes == null || bytes.Length == 0) return false;

            string realPrinter = ResolveInstalledPrinter(szPrinterName);
            IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
            Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "SDG_Delivery_Cupom";
            di.pDataType = "RAW";
            bool bSuccess = false;

            try {
                if (OpenPrinter(realPrinter, out hPrinter, IntPtr.Zero)) {
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
            } catch {
                bSuccess = false;
            } finally {
                Marshal.FreeCoTaskMem(pUnmanagedBytes);
            }
            return bSuccess;
        }

        public static bool PrintOfficeText(string szPrinterName, string text, float fontSize = 9.0f) {
            try {
                string realPrinter = ResolveInstalledPrinter(szPrinterName);
                PrintDocument pd = new PrintDocument();
                if (!string.IsNullOrEmpty(realPrinter)) {
                    pd.PrinterSettings.PrinterName = realPrinter;
                }
                pd.PrintPage += delegate(object sender, PrintPageEventArgs ev) {
                    using (Font font = new Font("Courier New", fontSize, FontStyle.Regular)) {
                        ev.Graphics.DrawString(text, font, Brushes.Black, ev.MarginBounds.Left, ev.MarginBounds.Top);
                    }
                    ev.HasMorePages = false;
                };
                pd.Print();
                return true;
            } catch {
                return false;
            }
        }
    }

    // =========================================================================
    // 🌐 Servidor HTTP Local (Porta 3001) para comunicação direta com a Web
    // =========================================================================
    public class HttpPrinterServer {
        private HttpListener _listener;
        private Thread _serverThread;
        private bool _isRunning = false;

        public bool IsRunning { get { return _isRunning; } }

        public bool Start() {
            try {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://localhost:3001/");
                _listener.Prefixes.Add("http://127.0.0.1:3001/");
                _listener.Start();
                _isRunning = true;

                _serverThread = new Thread(ListenLoop);
                _serverThread.IsBackground = true;
                _serverThread.Start();
                return true;
            } catch (Exception ex) {
                Logger.Log("Falha ao iniciar servidor HTTP: " + ex.Message);
                _isRunning = false;
                return false;
            }
        }

        public void Stop() {
            _isRunning = false;
            try {
                if (_listener != null && _listener.IsListening) {
                    _listener.Stop();
                    _listener.Close();
                }
            } catch {}
        }

        private void ListenLoop() {
            while (_isRunning && _listener != null && _listener.IsListening) {
                try {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(delegate {
                        ProcessRequest(context);
                    });
                } catch {
                    if (!_isRunning) break;
                }
            }
        }

        private void ProcessRequest(HttpListenerContext context) {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            try {
                // Headers CORS e Private Network Access (essenciais para Chrome HTTPS -> localhost)
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, *");
                response.Headers.Add("Access-Control-Allow-Private-Network", "true");

                if (request.HttpMethod == "OPTIONS") {
                    response.StatusCode = 204;
                    response.Close();
                    return;
                }

                string path = request.Url.AbsolutePath.ToLowerInvariant();
                if (path.StartsWith("/api/printer")) {
                    path = path.Substring(12);
                    if (!path.StartsWith("/")) path = "/" + path;
                }

                // Rota: Status
                if (path == "/" || path == "/status") {
                    SendJsonResponse(response, 200, "{\"success\":true,\"online\":true,\"port\":3001,\"message\":\"Servidor Nativo SDG Printer Ativo\"}");
                    return;
                }

                // Rota: Listar Impressoras Instaladas
                if (path == "/list" || path == "/printers") {
                    List<string> printers = new List<string>();
                    foreach (string p in PrinterSettings.InstalledPrinters) {
                        printers.Add(p);
                    }
                    string defPrinter = "";
                    try {
                        defPrinter = new PrinterSettings().PrinterName ?? "";
                    } catch {}

                    StringBuilder sb = new StringBuilder();
                    sb.Append("{\"success\":true,\"printers\":[");
                    for (int i = 0; i < printers.Count; i++) {
                        sb.Append("\"").Append(EscapeJson(printers[i])).Append("\"");
                        if (i < printers.Count - 1) sb.Append(",");
                    }
                    sb.Append("],\"defaultPrinter\":\"").Append(EscapeJson(defPrinter)).Append("\",\"networkPrinters\":[]}");

                    SendJsonResponse(response, 200, sb.ToString());
                    return;
                }

                // Rota: Imprimir Cupom / Comanda
                if (path == "/print" && request.HttpMethod == "POST") {
                    string body = "";
                    using (StreamReader sr = new StreamReader(request.InputStream, request.ContentEncoding)) {
                        body = sr.ReadToEnd();
                    }

                    string printerName = ExtractJsonString(body, "printerName");
                    if (string.IsNullOrEmpty(printerName)) {
                        try { printerName = new PrinterSettings().PrinterName ?? ""; } catch {}
                    }

                    string rawEscpos = ExtractJsonString(body, "rawEscpos");
                    bool isOffice = false;
                    string isOfficeVal = ExtractJsonValue(body, "isOffice");
                    if (isOfficeVal == "true") isOffice = true;
                    else {
                        string lower = (printerName ?? "").ToLowerInvariant();
                        if (lower.Contains("l3250") || lower.Contains("ecotank") || lower.Contains("deskjet") || lower.Contains("laserjet") || lower.Contains("pdf")) {
                            isOffice = true;
                        }
                    }

                    bool printSuccess = false;
                    if (isOffice) {
                        string cleanText = StripEscpos(rawEscpos);
                        printSuccess = RawPrinterHelper.PrintOfficeText(printerName, cleanText);
                    } else {
                        byte[] bytes = Encoding.GetEncoding("ISO-8859-1").GetBytes(rawEscpos);
                        printSuccess = RawPrinterHelper.SendBytes(printerName, bytes);
                        if (!printSuccess) {
                            string cleanText = StripEscpos(rawEscpos);
                            printSuccess = RawPrinterHelper.PrintOfficeText(printerName, cleanText);
                        }
                    }

                    string msg = printSuccess
                        ? string.Format("Cupom impresso com sucesso na impressora '{0}'!", EscapeJson(printerName))
                        : string.Format("Falha ao imprimir na impressora '{0}'. Verifique se está ligada.", EscapeJson(printerName));

                    string respJson = string.Format("{{\"success\":{0},\"printer\":\"{1}\",\"message\":\"{2}\"}}",
                        printSuccess ? "true" : "false",
                        EscapeJson(printerName),
                        EscapeJson(msg));

                    SendJsonResponse(response, 200, respJson);
                    return;
                }

                // Rota: Teste de Impressão Direta
                if (path == "/test" && request.HttpMethod == "POST") {
                    string body = "";
                    using (StreamReader sr = new StreamReader(request.InputStream, request.ContentEncoding)) {
                        body = sr.ReadToEnd();
                    }

                    string printerName = ExtractJsonString(body, "printerName");
                    if (string.IsNullOrEmpty(printerName)) {
                        try { printerName = new PrinterSettings().PrinterName ?? ""; } catch {}
                    }

                    string testSlip = string.Format(
                        "\x1B@" +
                        "================================================\n" +
                        "                SDG RESTAURANTE\n" +
                        "================================================\n" +
                        "TESTE DE IMPRESSAO DIRETA (WINDOWS NATIVO)\n" +
                        "IMPRESSORA: {0}\n" +
                        "DATA/HORA:  {1}\n" +
                        "STATUS:     COMUNICACAO 100% OPERACIONAL\n" +
                        "SISTEMA:    SDG Delivery (delivery.sdgtec.com.br)\n" +
                        "================================================\n" +
                        "Este teste confirma que sua impressora esta conectada\n" +
                        "e configurada com sucesso para impressao direta!\n" +
                        "================================================\n\n\n\n\x1DV\x00",
                        printerName,
                        DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss")
                    );

                    byte[] bytes = Encoding.GetEncoding("ISO-8859-1").GetBytes(testSlip);
                    bool testSuccess = RawPrinterHelper.SendBytes(printerName, bytes);
                    if (!testSuccess) {
                        string cleanText = StripEscpos(testSlip);
                        testSuccess = RawPrinterHelper.PrintOfficeText(printerName, cleanText);
                    }

                    string respJson = string.Format("{{\"success\":{0},\"printer\":\"{1}\",\"message\":\"Teste impresso na impressora '{1}'!\"}}",
                        testSuccess ? "true" : "false",
                        EscapeJson(printerName));

                    SendJsonResponse(response, 200, respJson);
                    return;
                }

                response.StatusCode = 404;
                response.Close();
            } catch {
                try {
                    response.StatusCode = 500;
                    response.Close();
                } catch {}
            }
        }

        private void SendJsonResponse(HttpListenerResponse response, int statusCode, string json) {
            byte[] buffer = Encoding.UTF8.GetBytes(json);
            response.ContentType = "application/json; charset=utf-8";
            response.StatusCode = statusCode;
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private string EscapeJson(string s) {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
        }

        private string StripEscpos(string text) {
            if (string.IsNullOrEmpty(text)) return "";
            string s = Regex.Replace(text, @"\x1B[@!a-z0-9\-\(\)]", "", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"\x1D[a-z0-9\-\(\)]", "", RegexOptions.IgnoreCase);
            s = Regex.Replace(s, @"[\x00-\x09\x0B\x0C\x0E-\x1F]", "");
            return s.Trim();
        }

        public static string ExtractJsonString(string json, string key) {
            if (string.IsNullOrEmpty(json)) return "";
            int idx = json.IndexOf("\"" + key + "\"");
            if (idx < 0) return "";
            int colonIdx = json.IndexOf(':', idx + key.Length + 2);
            if (colonIdx < 0) return "";
            int startQuote = json.IndexOf('"', colonIdx);
            if (startQuote < 0) return "";

            StringBuilder sb = new StringBuilder();
            for (int i = startQuote + 1; i < json.Length; i++) {
                char c = json[i];
                if (c == '\\') {
                    if (i + 1 >= json.Length) break;
                    char next = json[++i];
                    if (next == '"') sb.Append('"');
                    else if (next == '\\') sb.Append('\\');
                    else if (next == '/') sb.Append('/');
                    else if (next == 'b') sb.Append('\b');
                    else if (next == 'f') sb.Append('\f');
                    else if (next == 'n') sb.Append('\n');
                    else if (next == 'r') sb.Append('\r');
                    else if (next == 't') sb.Append('\t');
                    else if (next == 'u' && i + 4 < json.Length) {
                        string hex = json.Substring(i + 1, 4);
                        try {
                            int code = Convert.ToInt32(hex, 16);
                            sb.Append((char)code);
                            i += 4;
                        } catch {
                            sb.Append("\\u").Append(hex);
                        }
                    } else {
                        sb.Append(next);
                    }
                } else if (c == '"') {
                    break;
                } else {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        private string ExtractJsonValue(string json, string key) {
            if (string.IsNullOrEmpty(json)) return "";
            Match mBool = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
            if (mBool.Success) return mBool.Groups[1].Value.ToLowerInvariant();
            return ExtractJsonString(json, key);
        }
    }

    // =========================================================================
    // 🌐 Localizador e Gerenciador do Google Chrome
    // =========================================================================
    public static class ChromeFinder {
        public static string GetChromePath() {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string p1 = Path.Combine(pf, @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(p1)) return p1;

            string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            if (!string.IsNullOrEmpty(pf86)) {
                string p2 = Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe");
                if (File.Exists(p2)) return p2;
            }

            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string p3 = Path.Combine(localApp, @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(p3)) return p3;

            try {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")) {
                    if (key != null) {
                        string regPath = key.GetValue(null) as string;
                        if (!string.IsNullOrEmpty(regPath) && File.Exists(regPath)) return regPath;
                    }
                }
            } catch {}

            try {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe")) {
                    if (key != null) {
                        string regPath = key.GetValue(null) as string;
                        if (!string.IsNullOrEmpty(regPath) && File.Exists(regPath)) return regPath;
                    }
                }
            } catch {}

            return null;
        }
    }

    // =========================================================================
    // 📝 Logger
    // =========================================================================
    public static class Logger {
        public static void Log(string msg) {
            try {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string dir = Path.Combine(localApp, "SDG Delivery");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                File.AppendAllText(Path.Combine(dir, "launcher.log"), string.Format("[{0}] {1}\r\n", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), msg));
            } catch {}
        }
    }

    // =========================================================================
    // 🚀 Ponto de Entrada Principal
    // =========================================================================
    class Program {
        private static Mutex _appMutex;

        [STAThread]
        static void Main(string[] args) {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Logger.Log("=== Iniciando SDG Delivery ===");
            Logger.Log("Argumentos: " + string.Join(" ", args));

            bool serverOnly = false;
            bool windowed = false;
            foreach (string arg in args) {
                string a = (arg ?? "").ToLowerInvariant().Trim();
                if (a == "--server-only" || a == "-s") serverOnly = true;
                if (a == "--windowed" || a == "--normal" || a == "-w") windowed = true;
            }

            // 1. Instância Única via Mutex (evita abrir 2 servidores ou duplicar quiosque)
            bool createdNew;
            try {
                _appMutex = new Mutex(true, "Local\\SDG_Delivery_Kiosk_App_Mutex", out createdNew);
            } catch (Exception ex) {
                Logger.Log("Mutex exception: " + ex.Message);
                createdNew = true;
            }

            if (!createdNew) {
                Logger.Log("Outra instância já está em execução. Encerrando.");
                MessageBox.Show(
                    "O SDG Delivery já está em execução neste computador!\n\n" +
                    "Feche a janela existente antes de abrir uma nova.",
                    "SDG Delivery",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                return;
            }

            // 2. Verifica se o Google Chrome está instalado
            string chromePath = ChromeFinder.GetChromePath();
            Logger.Log("Chrome detectado: " + (chromePath ?? "NÃO ENCONTRADO"));
            if (string.IsNullOrEmpty(chromePath)) {
                DialogResult dr = MessageBox.Show(
                    "O Google Chrome não foi encontrado neste computador!\n\n" +
                    "O SDG Delivery precisa do Google Chrome instalado para funcionar com " +
                    "máxima velocidade no modo quiosque e com impressão direta automática.\n\n" +
                    "Deseja abrir a página oficial para baixar o Google Chrome agora?",
                    "SDG Delivery - Google Chrome Necessário",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning
                );

                if (dr == DialogResult.Yes) {
                    try {
                        Process.Start("https://www.google.com/chrome/");
                    } catch {}
                }
                return;
            }

            // 3. Inicia o Servidor HTTP de Impressão na porta 3001
            HttpPrinterServer server = new HttpPrinterServer();
            bool started = server.Start();
            Logger.Log("Servidor HTTP na porta 3001 iniciado: " + started);

            if (serverOnly) {
                Logger.Log("Modo --server-only ativo. Servidor rodando continuamente...");
                // Mantém o servidor rodando em segundo plano até o processo ser encerrado
                using (ManualResetEvent mre = new ManualResetEvent(false)) {
                    mre.WaitOne();
                }
                server.Stop();
                return;
            }

            // 4. Prepara perfil de quiosque isolado
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string profileDir = Path.Combine(localApp, @"SDG Delivery\ChromeKiosk");
            try {
                if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);
            } catch {}

            // 5. Inicia o Google Chrome no Modo Quiosque com Impressão Silenciosa
            string targetUrl = "https://delivery.sdgtec.com.br";
            string chromeArgs = windowed
                ? string.Format("--app=\"{0}\" --kiosk-printing --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check", targetUrl, profileDir)
                : string.Format("--kiosk \"{0}\" --kiosk-printing --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check", targetUrl, profileDir);

            Logger.Log(string.Format("Iniciando Chrome: {0} {1}", chromePath, chromeArgs));
            Process chromeProcess = null;
            try {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = chromePath;
                psi.Arguments = chromeArgs;
                psi.UseShellExecute = true;
                chromeProcess = Process.Start(psi);
                if (chromeProcess != null) {
                    Logger.Log("Chrome iniciado com PID: " + chromeProcess.Id);
                }
            } catch (Exception ex) {
                Logger.Log("Erro ao iniciar Chrome: " + ex.Message);
                MessageBox.Show("Erro ao abrir o Google Chrome:\n\n" + ex.Message, "SDG Delivery", MessageBoxButtons.OK, MessageBoxIcon.Error);
                server.Stop();
                return;
            }

            // 6. Aguarda o Chrome ser encerrado pelo operador
            if (chromeProcess != null) {
                try {
                    chromeProcess.WaitForExit();
                    Logger.Log("Chrome encerrado pelo operador.");
                } catch {}
            }

            // 7. Encerra o servidor de impressão limpo
            Logger.Log("Encerrando servidor de impressão.");
            server.Stop();

            GC.KeepAlive(_appMutex);
        }
    }
}
