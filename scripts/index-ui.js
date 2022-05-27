let $ = mdui.$

const fs = require('fs');
const USER_HOME = process.env.HOME || process.env.USERPROFILE
const { exec, spawn } = require("child_process")
const electron = require('electron')
const ipcRenderer = electron.ipcRenderer
const shell = electron.shell

let connectionSets = []
let baseConfigPath = USER_HOME + '/.gostui3'
let connectionSetsFilePath = baseConfigPath + '/config.json'
let selectedConnectionConfig = baseConfigPath + '/selectedConnection.txt'

let connectionProcessesMap = new Map()
let maxLogLine = 500
let currentLogLine = 0

let drawInst = null




function createConfigDir() {
    if (!fs.existsSync(baseConfigPath)) {
        fs.mkdirSync(baseConfigPath);
    }
}

createConfigDir()

function createSelectedConnectionFile() {
    if (!fs.existsSync(selectedConnectionConfig)) {
        fs.writeFileSync(selectedConnectionConfig, "", { encoding: 'utf8' })
    }
}

createSelectedConnectionFile()



function preLoadConnectionSets() {
    if (fs.existsSync(connectionSetsFilePath)) {
        loadConnectionSets()
    }
}
preLoadConnectionSets()




function toggleDrawer() {
    if (!drawInst) {
        drawInst = new mdui.Drawer("#drawer")
    }
    drawInst.toggle()
}




function showAddConnectionForm() {
    $("#connectionForm").html(`<div class="mdui-textfield">
    <label class="mdui-textfield-label">名称</label>
    <input id="connectionName" class="mdui-textfield-input" type="text" />
</div>
<div class="mdui-textfield">
    <label class="mdui-textfield-label">代理</label>
    <input id="connectionL" class="mdui-textfield-input" type="text"
        placeholder="例如：'-L :8080' or '-L tcp://:8080/192.168.1.1:80' 等" />
</div>
<div class="mdui-textfield">
    <label class="mdui-textfield-label">转发</label>
    <input id="connectionF" class="mdui-textfield-input" type="text" placeholder="例如：'-F http://192.168.1.1:8080'" />
</div>

<button onclick="saveConnection()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" title="保存"><i
        class="mdui-icon material-icons">save</i></button>`);
}




function saveConnection() {
    let connectionName = $("#connectionName").val()
    let connectionL = $("#connectionL").val()
    let connectionF = $("#connectionF").val()

    if (!connectionName || !connectionL) {
        mdui.alert("名称 和 代理 不能为空", function () { }, { "confirmText": "确定" })
        return
    }

    console.log("got connection profile: ", connectionName, connectionL, connectionF)
    connectionConfig = {
        "connectionName": connectionName,
        "connectionL": connectionL,
        "connectionF": connectionF
    };
    let idx = connectionSets.findIndex(item => item.connectionName == connectionName)
    if (idx == -1) {
        connectionSets.push(connectionConfig)
    } else {
        connectionSets[idx] = connectionConfig
    }

    
    fs.writeFileSync(connectionSetsFilePath, JSON.stringify(connectionSets, null, 4), { encoding: 'utf8' });
    mdui.snackbar({
        message: '保存成功',
        position: 'right-top'
    });

    
    loadConnectionSets()
    
    selectConnectionItem(connectionName)
}




function loadConnectionSets() {
    
    let text = fs.readFileSync(connectionSetsFilePath, { encoding: 'utf8', flag: 'r' })
    connectionSets = JSON.parse(text)

    let drawerHtml = ""
    for (let i = 0; i < connectionSets.length; i++) {
        drawerHtml += `<li class="mdui-list-item mdui-ripple" onclick="selectConnectionItem(this)">
        <i class="mdui-list-item-icon mdui-icon material-icons">computer</i>
        <div class="mdui-list-item-content">${connectionSets[i].connectionName}</div>
    </li>`
    }

    $("#drawer").html(drawerHtml)

    
    let selectedConnectionName = fs.readFileSync(selectedConnectionConfig, { encoding: 'utf8', flag: 'r' })
    selectConnectionItem(selectedConnectionName)

    
    let runningConnectionNames = connectionProcessesMap.keys()
    for (connName of runningConnectionNames) {
        setDrawerItemRunningClass(connName, "runningItem")
    }
}




function setSelectedConnectionActiveClass(connectionName) {
    setDrawerItemClass(connectionName, "mdui-list-item-active")
}




function selectConnectionItem(obj) {
    let connectionName = obj
    if (typeof (obj) != 'string') {
        connectionName = $(obj).find("div").text()
    }
    console.log("选中了：" + connectionName);

    if (!connectionName) {
        return
    }

    let idx = connectionSets.findIndex(item => item.connectionName == connectionName)
    connectionConfig = connectionSets[idx]

    let connectionForm = `<div class="mdui-textfield">
    <label class="mdui-textfield-label">名称</label>
    <input id="connectionName" class="mdui-textfield-input" type="text" value="${connectionConfig.connectionName}" />
</div>
<div class="mdui-textfield">
    <label class="mdui-textfield-label">代理</label>
    <input id="connectionL" class="mdui-textfield-input" type="text" value="${connectionConfig.connectionL}"
        placeholder="例如：'-L :8080' or '-L tcp://:8080/192.168.1.1:80' 等" />
</div>
<div class="mdui-textfield">
    <label class="mdui-textfield-label">转发</label>
    <input id="connectionF" class="mdui-textfield-input" type="text" value="${connectionConfig.connectionF}"
        placeholder="例如：'-F http://192.168.1.1:8080'" />
</div>

<button onclick="saveConnection()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" title="保存"><i
        class="mdui-icon material-icons">save</i></button>
<button onclick="deleteConnection()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" title="删除"><i
        class="mdui-icon material-icons">delete_forever</i></button>
<button onclick="startConnection()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" title="启动"><i
        class="mdui-icon material-icons">play_circle_filled</i></button>
<button onclick="stopConnection()" class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" title="停止"><i
        class="mdui-icon material-icons">stop</i></button>
</div>`

    $("#connectionForm").html(connectionForm)

    
    setSelectedConnectionActiveClass(connectionName)

    
    saveSelectedConnectionStatus(connectionName)
}




function saveSelectedConnectionStatus(connectionName) {
    let selectedConnectionName = fs.readFileSync(selectedConnectionConfig, { encoding: 'utf8', flag: 'r' })
    if (selectedConnectionName != connectionName) {
        fs.writeFileSync(selectedConnectionConfig, connectionName, { encoding: 'utf8' });
    }
}




function deleteConnection() {

    
    mdui.confirm('确定要删除该连接配置吗', function () {
       
        let connectionName = $("#connectionName").val()

        
        if (connectionProcessesMap.get(connectionName)) {
            mdui.alert("连接运行中，请先停止再删除", function () { }, { "confirmText": "确定" })
            return
        }

        
        connectionSets = connectionSets.filter(item => item.connectionName != connectionName)
        fs.writeFileSync(connectionSetsFilePath, JSON.stringify(connectionSets, null, 4), { encoding: 'utf8' });

        
        fs.writeFileSync(selectedConnectionConfig, "", { encoding: 'utf8' })

        
        preLoadConnectionSets()
        $("#connectionForm").html("<br>选择连接列表项显示具体内容")

        mdui.snackbar({
            message: '删除成功',
            position: 'right-top'
        });
    }, function (params) { }, { "confirmText": "确定", "cancelText": "取消" });

}

function unSetDrawerItemClass(connectionName, className) {
    let classStr = " " + className

    let items = $("#drawer").find("li")
    $.each(items, function (i, v) {
        let originClass = $(items[i]).attr("class")
        let runningItemIndex = originClass.indexOf(classStr)

        if (runningItemIndex != -1 && $(items[i]).find("div").text() == connectionName) {
            originClass = originClass.replace(classStr, "")
            $(items[i]).attr("class", originClass)
        }
    })
}

function setDrawerItemClass(connectionName, className) {
    let classStr = " " + className

    let items = $("#drawer").find("li")
    $.each(items, function (i, v) {
        let originClass = $(items[i]).attr("class")
        let runningItemIndex = originClass.indexOf(classStr)

       
        if (runningItemIndex != -1 && className == "runningItem") {
            // do nothing
        } else if (runningItemIndex != -1) {
            originClass = originClass.replace(classStr, "")
        }
        if ($(items[i]).find("div").text() == connectionName) {
            $(items[i]).attr("class", originClass + classStr)
        } else {
            $(items[i]).attr("class", originClass)
        }
    })
}

function setDrawerItemRunningClass(connectionName) {
    setDrawerItemClass(connectionName, "runningItem")
}

function startConnection() {
    
    
    let connectionName = $("#connectionName").val()
    
    let connectionL = $("#connectionL").val()
    
    let connectionF = $("#connectionF").val()

    
    if (connectionProcessesMap.get(connectionName)) {
        mdui.alert("进程已经是启动状态")
        return
    }

    
    doStartConnectionProcess(connectionName, connectionL, connectionF)

    
    setDrawerItemRunningClass(connectionName)
}

function doStartConnectionProcess(connectionName, connectionL, connectionF) {
    if (connectionProcessesMap.get(connectionName)) {
        log(connectionName, "运行中")
        return
    }

    
    let gostPath = getGostPath()
    log("执行连接命令 " + gostPath + " " + connectionL + " " + connectionF)
    let childProcess
    let params = []

    let listeners = connectionL.split("-L")
    listeners.forEach(element => {
        let trimed = element.trim()
        if (trimed != "") {
            params.push("-L")
            params.push(trimed)
        }
    });

    if (connectionF) {
        let forwards = connectionF.split("-F")
        forwards.forEach(element => {
            let trimed = element.trim()
            if (trimed != "") {
                params.push("-F")
                params.push(trimed)
            }
        })
    }
        
    childProcess = spawn(gostPath, params)
    let childProcessId = childProcess.pid
    log('新连接进程id ' + childProcessId)
    connectionProcessesMap.set(connectionName, childProcess)

    
    childProcess.stdout.on("data", function (data) {
        log(connectionName + ": " + data)
    })
    childProcess.stderr.on("data", function (data) {
        log(connectionName + ": " + data)
    })
    childProcess.on("exit", code => {
        log(connectionName + ": " + "连接进程 " + childProcessId + " 退出 ")
    })
    childProcess.on("close", code => {
        
        unSetDrawerItemClass(connectionName, "runningItem")
        connectionProcessesMap.delete(connectionName)
        log(connectionName + ": " + "连接进程 " + childProcessId + " 关闭 ")
    });
    
    childProcess.stdin.end()
}

function getGostPath() {
    let gostPath
    let markStr
    let idx
    switch (process.platform) {
        case 'darwin':
            markStr = '/Resources/app.asar'
            idx = __dirname.indexOf(markStr)
            if (idx != -1) {
                gostPath = __dirname.substring(0, idx) + "/gost/gost-darwin-amd64"
            } else {
                gostPath = __dirname + "/gost/gost-darwin-amd64"
            }
            break
        case 'linux':
            markStr = '/resources/app.asar'
            idx = __dirname.indexOf(markStr)
            if (idx != -1) {
                gostPath = __dirname.substring(0, idx) + "/gost/gost-linux-amd64"
            } else {
                gostPath = __dirname + "/gost/gost-linux-amd64"
            }
            break
        case 'win32':
            markStr = '\\resources\\app.asar'
            idx = __dirname.indexOf(markStr)
            if (idx != -1) {
                gostPath = __dirname.substring(0, idx) + "/gost/gost-windows-amd64"
            } else {
                gostPath = __dirname + "/gost/gost-windows-amd64.exe"
            }
            break
        default:
            break;
    }

    return gostPath
}

function log(text) {
    if (text == null || text == "" || text == '\n') return;
    text = text.toString()

    
    if (text.indexOf('\n') == -1) {
        text = text + '\n'
    }

    
    let gostLog = document.getElementById("gostLog")
    gostLog.innerHTML = gostLog.innerHTML + text

    
    currentLogLine += text.split("\n").length - 1 
    let diff = currentLogLine - maxLogLine
    if (diff > 0) {
        let cutIdx = 0
        for (let i = 0; i < diff; i++) {
            cutIdx = gostLog.innerHTML.indexOf("\n", cutIdx + 1)
        }
        gostLog.innerHTML = gostLog.innerHTML.substring(cutIdx + 1)
        currentLogLine -= diff
    }


    gostLog.scrollTop = gostLog.scrollHeight;
}

function stopConnection() {
    
    let connectionName = $("#connectionName").val()

    
    if (!connectionProcessesMap.get(connectionName)) {
        mdui.alert("连接本是关闭状态，无需停止")
        return
    }

    
    let connectionProcess = connectionProcessesMap.get(connectionName)
    connectionProcess.kill()

    
    connectionProcessesMap.delete(connectionName)
    mdui.snackbar({
        message: '已停止',
        position: 'right-top'
    })

    
    unSetDrawerItemClass(connectionName, "runningItem")
}

function clearLog() {
    $("#gostLog").html("")
    currentLogLine = 0
}