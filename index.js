const electron = require('electron')
const { app, Menu, BrowserWindow, ipcMain, Tray, nativeImage } = electron
const fs = require("fs")
const path = require("path")

const USER_HOME = process.env.HOME || process.env.USERPROFILE

let win

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 750,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: false,
            allowRunningInsecureContent: true,
        }
    })

    win.setIcon(path.join(__dirname, "images/gostui.png"))
    win.loadFile('index.html')

    if (process.platform == 'darwin') {
        app.dock.setIcon(path.join(__dirname, 'images/gostui.png'));
    }

    
    win.on('close', e => {
        win.hide();
        win.setSkipTaskbar(true);
        e.preventDefault();
    })

    
}

app.whenReady().then(createWindow)










app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.on('ready', () => {
    createMenu()
    createTray()
    createConfigDir()

    
    if (process.platform == 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            {
                label: '关闭程序',
                click: () => { 
                    win.webContents.send('exit', true)
                    setTimeout(() => {
                        if (win.isVisible()) {
                            win.destroy()
                        }
                        app.quit()
                    }, 500)
                }
            }
        ]))

        
        app.on('before-quit', function() {
            win.webContents.send('exit', true)
            setTimeout(() => {
                if (win.isVisible()) {
                    win.destroy()
                }
                app.quit()
            }, 500)
        });
    }
})

let startOnboot = false;
let startOnBootConfigPath = USER_HOME + "/.gostui3/startOnBoot.txt"
{ 
    if (fs.existsSync(startOnBootConfigPath)) {
        startOnboot =  (fs.readFileSync(startOnBootConfigPath) == 'true')
    }
}


let menuTemplate = [
    {
        label: '窗口',
        submenu: [
            {
                label: '缩小',
                role: 'zoomOut'
            },
            {
                label: '放大',
                role: 'zoomIn'
            },
            {
                label: '复原',
                role: 'resetZoom'
            },
            {
                label: '关闭程序',
                
                click: () => {
                    win.webContents.send('exit', true)
                    setTimeout(() => {
                        try {
                            if (win) win.destroy()
                        } catch (err) {
                            // do nothing
                        }

                        
                        if (process.platform == 'darwin' || process.platform == 'linux') {
                            app.quit()
                        }
                    }, 500)
                }
            }
        ]
    },
    {
        label: '设置',
        submenu: [
            {
                label: '开机启动',
                type: 'checkbox',
                checked: startOnboot,
                click: (e) => {
                    if (e.checked) {
                        startOnboot = true
                        fs.writeFileSync(startOnBootConfigPath, 'true')
                        app.setLoginItemSettings({
                            openAtLogin: startOnboot,
                            openAsHidden: startOnboot
                        })
                    } else {
                        startOnboot = false
                        fs.writeFileSync(startOnBootConfigPath, 'false')
                        app.setLoginItemSettings({
                            openAtLogin: startOnboot,
                            openAsHidden: startOnboot
                        })
                    }
                }
            }
        ]
    },
    {
        label: '调试',
        submenu: [
            
            
                
                
               
            
           
            {
                label: '打开调试工具',
                accelerator: 'CmdOrCtrl+d',
                click: () => {
                    win.webContents.openDevTools()
                }
            }
        ]
    },
    {
        label: '帮助',
        submenu: [
            {
                label: '关于GoST UI',
                click: () => {
                    win.webContents.send('about', true)
                }
            }
        ]
    }
]


function createMenu() {
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
}


let tray
function createTray() {
    
    if (process.platform == 'darwin') {
        tray = new Tray(path.join(__dirname, 'images/gostui16.png'))
    } else {
        tray = new Tray(path.join(__dirname, 'images/gostui.png'))
    }

    tray.setToolTip('显示界面')
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示界面',
            role: 'redo',
            click: () => {
                if (win) {
                    win.show()
                }
            }
        },
        {
            label: '关闭程序',
            click: () => { 
                try {
                    if (win) win.webContents.send('exit', true)
                } catch (err) {
                    // do nothing
                }
               
                setTimeout(() => {
                    win.destroy()

                    
                    if (process.platform == 'darwin' || process.platform == 'linux') {
                        app.quit()
                    }
                }, 500)
            }
        }
    ])
    tray.setContextMenu(contextMenu)
    tray.on('click', (event, bounds, position) => {  // 监听单击做的时
        win.isVisible() ? win.hide() : win.show()
        win.isVisible() ? win.setSkipTaskbar(false) : win.setSkipTaskbar(true)
    })
}


function createConfigDir() {
    let pathStr = USER_HOME + "/.gostui"
    if (!fs.existsSync(pathStr)) {
        fs.mkdirSync(pathStr);
    }
}