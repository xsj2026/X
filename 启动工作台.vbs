' 启动工作台.vbs - 静默启动本地服务并打开工作台（无弹窗）
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

port    = "8765"
workDir = fso.GetParentFolderName(WScript.ScriptFullName)
python  = "C:\Users\21952\.workbuddy\binaries\python\versions\3.13.12\python.exe"
browser = "C:\Users\21952\AppData\Roaming\360se6\Application\360se.exe"
url     = "http://localhost:" & port & "/cover.html"

' --- 检查服务是否已在运行 ---
Function ServerUp()
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP")
    http.setTimeouts 800, 800, 800, 800
    http.Open "GET", url, False
    http.Send
    ServerUp = (Err.Number = 0 And http.Status < 500)
    On Error GoTo 0
End Function

' --- 启动 HTTP 服务（隐藏窗口，独立进程）---
If Not ServerUp() Then
    sh.Run """" & python & """ -m http.server " & port & " --directory """ & workDir & """", 0, False
    ' 最多等 8 秒让服务就绪
    For i = 1 To 16
        WScript.Sleep 500
        If ServerUp() Then Exit For
    Next
End If

' --- 打开浏览器 ---
If fso.FileExists(browser) Then
    sh.Run """" & browser & """ --app=" & url
Else
    sh.Run url
End If
