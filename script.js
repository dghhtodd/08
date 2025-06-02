// 全局变量
let notes = [
    {
        id: 1,
        title: "欢迎使用斜记本",
        content: "<h1>欢迎使用斜记本！</h1><p>这是一个简约而不简单的笔记应用，希望能帮助你记录生活和工作中的灵感。</p><p>主要功能：</p><ul><li>支持富文本编辑</li><li>笔记加密保护</li><li>多种格式导出</li><li>日历视图</li><li>暗色模式</li></ul><p>开始使用吧！</p>",
        createdAt: "2023-06-01T10:00:00Z",
        updatedAt: "2023-06-01T10:00:00Z",
        locked: false,
        password: "",
        date: "2023-06-01"
    },
    {
        id: 2,
        title: "使用技巧",
        content: "<h2>斜记本使用技巧</h2><p>以下是一些使用技巧：</p><ol><li>使用工具栏格式化你的文本</li><li>可以插入图片、视频、音频和文件</li><li>重要的笔记可以加密保护</li><li>使用搜索功能快速找到笔记</li><li>可以按日期查看和创建笔记</li></ol>",
        createdAt: "2023-06-02T14:30:00Z",
        updatedAt: "2023-06-02T15:45:00Z",
        locked: false,
        password: "",
        date: "2023-06-02"
    }
];

let currentNote = null;
let history = [];
let historyIndex = -1;
let searchTimeout = null;

// DOM 元素
const notesList = document.getElementById('notes-list');
const editor = document.getElementById('editor');
const searchInput = document.getElementById('search-input');
const wordCount = document.getElementById('word-count');
const lastSaved = document.getElementById('last-saved');
const passwordModal = document.getElementById('password-modal');
const unlockModal = document.getElementById('unlock-modal');
const exportModal = document.getElementById('export-modal');
const shareModal = document.getElementById('share-modal');

// 初始化应用
function initApp() {
    // 从本地存储加载笔记
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    }
    
    renderNotesList();
    
    // 检查URL是否包含分享参数
    const urlParams = new URLSearchParams(window.location.search);
    const shareNoteId = urlParams.get('share');
    
    if (shareNoteId) {
        // 查找分享的笔记
        const sharedNote = notes.find(note => note.id == shareNoteId);
        if (sharedNote) {
            // 如果找到了分享的笔记，选择它
            selectNote(sharedNote);
        } else {
            // 如果没有找到分享的笔记，选择第一个笔记
            if (notes.length > 0) {
                selectNote(notes[0]);
            }
        }
    } else {
        // 如果没有分享参数，选择第一个笔记
        if (notes.length > 0) {
            selectNote(notes[0]);
        }
    }
    
    // 生成日历
    generateCalendar();
    
    // 设置事件监听器
    setupEventListeners();
}

// 渲染笔记列表
function renderNotesList(searchTerm = '') {
    notesList.innerHTML = '';
    
    let filteredNotes = notes;
    
    // 如果有搜索词，过滤笔记
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(term) || 
            (note.content && stripHtml(note.content).toLowerCase().includes(term))
        );
    }
    
    filteredNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        if (currentNote && note.id === currentNote.id) {
            noteItem.classList.add('active');
        }
        
        const noteTitle = document.createElement('div');
        noteTitle.className = 'note-title';
        noteTitle.innerHTML = `
            ${note.title}
            ${note.locked ? '<span class="locked-icon"><i class="fas fa-lock"></i></span>' : ''}
        `;
        
        // 添加笔记操作按钮
        const noteActions = document.createElement('div');
        noteActions.className = 'note-actions';
        noteActions.innerHTML = `
            <button class="note-action-btn rename-note" title="重命名笔记"><i class="fas fa-edit"></i></button>
            <button class="note-action-btn delete-note" title="删除笔记"><i class="fas fa-trash"></i></button>
        `;
        
        const notePreview = document.createElement('div');
        notePreview.className = 'note-preview';
        notePreview.textContent = stripHtml(note.content).substring(0, 60) + (stripHtml(note.content).length > 60 ? '...' : '');
        
        const noteMeta = document.createElement('div');
        noteMeta.className = 'note-meta';
        noteMeta.innerHTML = `
            <span>${formatDate(new Date(note.updatedAt))}</span>
            <span>${countWords(stripHtml(note.content))} 字</span>
        `;
        
        noteItem.appendChild(noteTitle);
        noteItem.appendChild(noteActions); // 添加操作按钮
        noteItem.appendChild(notePreview);
        noteItem.appendChild(noteMeta);
        
        // 为笔记项添加点击事件
        noteItem.addEventListener('click', (e) => {
            // 如果点击的是操作按钮，不选择笔记
            if (!e.target.closest('.note-actions')) {
                selectNote(note);
            }
        });
        
        // 为重命名按钮添加点击事件
        noteItem.querySelector('.rename-note').addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            renameNote(note);
        });
        
        // 为删除按钮添加点击事件
        noteItem.querySelector('.delete-note').addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            deleteNote(note);
        });
        
        notesList.appendChild(noteItem);
    });
}

// 选择笔记
function selectNote(note) {
    // 如果当前有笔记且已修改，保存它
    if (currentNote && editor.getAttribute('data-modified') === 'true') {
        saveCurrentNote();
    }
    
    currentNote = note;
    
    // 更新笔记列表中的活动项
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('.note-title').textContent.trim() === note.title) {
            item.classList.add('active');
        }
    });
    
    // 如果笔记被锁定，显示锁定界面
    if (note.locked) {
        editor.innerHTML = `
            <div style="text-align:center; padding:50px;">
                <i class="fas fa-lock" style="font-size:48px; color:#888; margin-bottom:20px;"></i>
                <h2>此笔记已加密</h2>
                <p>请点击下方按钮输入密码解锁</p>
                <button id="unlock-button" style="margin-top:20px; padding:8px 15px; background-color:#4a6fa5; color:white; border:none; border-radius:4px; cursor:pointer;">解锁笔记</button>
            </div>
        `;
        
        document.getElementById('unlock-button').addEventListener('click', showUnlockModal);
    } else {
        editor.innerHTML = note.content;
    }
    
    editor.setAttribute('data-modified', 'false');
    updateWordCount();
    
    // 添加到历史记录
    addToHistory(note);
}

// 历史记录管理
function addToHistory(note) {
    // 如果当前不在历史记录的最后，删除当前位置之后的所有记录
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    // 添加到历史记录
    history.push(note);
    historyIndex = history.length - 1;
    
    // 更新历史导航按钮状态
    updateHistoryButtons();
}

function navigateBack() {
    if (historyIndex > 0) {
        historyIndex--;
        openNoteFromHistory();
    }
}

function navigateForward() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        openNoteFromHistory();
    }
}

function openNoteFromHistory() {
    const note = history[historyIndex];
    const actualNote = notes.find(n => n.id === note.id);
    
    if (actualNote) {
        // 不添加到历史记录
        currentNote = actualNote;
        
        // 更新笔记列表中的活动项
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector('.note-title').textContent.trim() === actualNote.title) {
                item.classList.add('active');
            }
        });
        
        // 如果笔记被锁定，显示锁定界面
        if (actualNote.locked) {
            editor.innerHTML = `
                <div style="text-align:center; padding:50px;">
                    <i class="fas fa-lock" style="font-size:48px; color:#888; margin-bottom:20px;"></i>
                    <h2>此笔记已加密</h2>
                    <p>请点击下方按钮输入密码解锁</p>
                    <button id="unlock-button" style="margin-top:20px; padding:8px 15px; background-color:#4a6fa5; color:white; border:none; border-radius:4px; cursor:pointer;">解锁笔记</button>
                </div>
            `;
            
            document.getElementById('unlock-button').addEventListener('click', showUnlockModal);
        } else {
            editor.innerHTML = actualNote.content;
        }
        
        editor.setAttribute('data-modified', 'false');
        updateWordCount();
    }
    
    // 更新历史导航按钮状态
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const backButton = document.getElementById('history-back');
    const forwardButton = document.getElementById('history-forward');
    
    backButton.disabled = historyIndex <= 0;
    forwardButton.disabled = historyIndex >= history.length - 1;
}

// 笔记操作
function renameNote(note) {
    const newTitle = prompt('输入新的笔记标题', note.title);
    if (newTitle && newTitle.trim() !== '') {
        note.title = newTitle.trim();
        note.updatedAt = new Date().toISOString();
        renderNotesList();
        simulateSave();
    }
}

function deleteNote(note) {
    if (confirm(`确定要删除笔记 "${note.title}" 吗？`)) {
        const index = notes.findIndex(n => n.id === note.id);
        if (index !== -1) {
            notes.splice(index, 1);
            renderNotesList();
            
            // 如果还有笔记，选择第一个
            if (notes.length > 0) {
                selectNote(notes[0]);
            } else {
                currentNote = null;
                editor.innerHTML = '';
            }
            
            simulateSave();
        }
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 新建笔记
    document.getElementById('new-note').addEventListener('click', () => {
        const newNote = {
            id: Date.now(),
            title: '新笔记',
            content: '<p>开始写作...</p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            locked: false,
            password: "",
            date: new Date().toISOString().split('T')[0]
        };
        
        notes.unshift(newNote);
        renderNotesList();
        selectNote(newNote);
    });
    
    // 主题切换
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const themeIcon = document.querySelector('#theme-toggle i');
        
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });
    
    // 加载保存的主题
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.querySelector('#theme-toggle i').classList.replace('fa-moon', 'fa-sun');
    }
    
    // 文本对齐
    document.getElementById('align-left').addEventListener('click', () => {
        document.execCommand('justifyLeft', false, null);
    });
    
    document.getElementById('align-center').addEventListener('click', () => {
        document.execCommand('justifyCenter', false, null);
    });
    
    document.getElementById('align-right').addEventListener('click', () => {
        document.execCommand('justifyRight', false, null);
    });
    
    // 标题
    document.getElementById('heading').addEventListener('click', () => {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            
            if (selectedText) {
                document.execCommand('insertHTML', false, `<h2>${selectedText}</h2>`);
            } else {
                document.execCommand('insertHTML', false, '<h2>标题</h2>');
            }
        } else {
            document.execCommand('insertHTML', false, '<h2>标题</h2>');
        }
    });
    
    // 列表
    document.getElementById('list-ul').addEventListener('click', () => {
        document.execCommand('insertUnorderedList', false, null);
    });
    
    document.getElementById('list-ol').addEventListener('click', () => {
        document.execCommand('insertOrderedList', false, null);
    });
    
    // 文本格式
    document.getElementById('bold').addEventListener('click', () => {
        document.execCommand('bold', false, null);
    });
    
    document.getElementById('italic').addEventListener('click', () => {
        document.execCommand('italic', false, null);
    });
    
    document.getElementById('underline').addEventListener('click', () => {
        document.execCommand('underline', false, null);
    });
    
    // 锁定笔记
    document.getElementById('lock-note').addEventListener('click', () => {
        if (!currentNote) return;
        
        if (currentNote.locked) {
            showUnlockModal();
        } else {
            showPasswordModal();
        }
    });
    
    // 插入媒体
    document.getElementById('insert-image').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                insertImage(file);
            }
        };
        input.click();
    });
    
    document.getElementById('insert-video').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                insertVideo(file);
            }
        };
        input.click();
    });
    
    document.getElementById('insert-audio').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                insertAudio(file);
            }
        };
        input.click();
    });
    
    document.getElementById('insert-file').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                insertFile(file);
            }
        };
        input.click();
    });
    
    // 导出笔记
    document.getElementById('export-note').addEventListener('click', () => {
        if (!currentNote) return;
        showExportModal();
    });
    
    // 分享笔记
    document.getElementById('share-note').addEventListener('click', () => {
        if (!currentNote) return;
        showShareModal();
    });
    
    // 搜索
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderNotesList(searchInput.value);
        }, 300);
    });
    
    // 编辑器内容变化
    editor.addEventListener('input', () => {
        if (currentNote && !currentNote.locked) {
            editor.setAttribute('data-modified', 'true');
            updateWordCount();
            debounceSave();
        }
    });
    
    // 密码模态框
    document.getElementById('close-password-modal').addEventListener('click', closePasswordModal);
    document.getElementById('set-password').addEventListener('click', setNotePassword);
    
    // 解锁模态框
    document.getElementById('close-unlock-modal').addEventListener('click', closeUnlockModal);
    document.getElementById('unlock-note').addEventListener('click', unlockNote);
    
    // 导出模态框
    document.getElementById('close-export-modal').addEventListener('click', closeExportModal);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
    document.getElementById('export-word').addEventListener('click', exportToWord);
    document.getElementById('export-html').addEventListener('click', exportToHTML);
    document.getElementById('export-txt').addEventListener('click', exportToTXT);
    document.getElementById('export-md').addEventListener('click', exportToMD);
    
    // 分享模态框
    document.getElementById('close-share-modal').addEventListener('click', closeShareModal);
    document.getElementById('copy-link').addEventListener('click', copyShareLink);
    
    // 历史导航
    document.getElementById('history-back').addEventListener('click', navigateBack);
    document.getElementById('history-forward').addEventListener('click', navigateForward);
    
    // 日历切换
    document.getElementById('calendar-toggle').addEventListener('click', toggleCalendar);
    
    // 日历点击
    document.getElementById('calendar-body').addEventListener('click', handleCalendarClick);
}

// 保存当前笔记
function saveCurrentNote() {
    if (!currentNote || currentNote.locked) return;
    
    currentNote.content = editor.innerHTML;
    currentNote.updatedAt = new Date().toISOString();
    
    // 从内容中提取标题
    const extractedTitle = extractTitleFromContent(currentNote.content);
    if (extractedTitle && extractedTitle !== currentNote.title) {
        currentNote.title = extractedTitle;
    }
    
    renderNotesList();
    simulateSave();
    
    editor.setAttribute('data-modified', 'false');
}

// 模拟保存到服务器
function simulateSave() {
    // 在实际应用中，这里会发送请求到服务器
    // 此处仅保存到本地存储
    localStorage.setItem('notes', JSON.stringify(notes));
    
    // 更新最后保存时间
    lastSaved.textContent = '刚刚';
}

// 防抖保存
let saveTimeout;
function debounceSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCurrentNote();
    }, 1000);
}

// 更新字数统计
function updateWordCount() {
    if (currentNote && !currentNote.locked) {
        const text = stripHtml(editor.innerHTML);
        wordCount.textContent = countWords(text);
    } else {
        wordCount.textContent = '0';
    }
}

// 从内容中提取标题
function extractTitleFromContent(content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 尝试从h1标签中提取
    const h1 = tempDiv.querySelector('h1');
    if (h1 && h1.textContent.trim()) {
        return h1.textContent.trim();
    }
    
    // 尝试从h2标签中提取
    const h2 = tempDiv.querySelector('h2');
    if (h2 && h2.textContent.trim()) {
        return h2.textContent.trim();
    }
    
    // 尝试从第一段中提取
    const p = tempDiv.querySelector('p');
    if (p && p.textContent.trim()) {
        const text = p.textContent.trim();
        return text.length > 20 ? text.substring(0, 20) + '...' : text;
    }
    
    return null;
}

// 格式化日期
function formatDate(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (noteDate.getTime() === today.getTime()) {
        return '今天 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    } else if (noteDate.getTime() === yesterday.getTime()) {
        return '昨天 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    } else {
        return date.getFullYear() + '-' + 
               (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
               date.getDate().toString().padStart(2, '0');
    }
}

// 插入图片
function insertImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '100%';
        
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';
        mediaContainer.appendChild(img);
        
        // 插入到编辑器
        document.execCommand('insertHTML', false, mediaContainer.outerHTML);
        
        // 添加调整大小的控件
        const images = editor.querySelectorAll('.media-container img');
        const lastImage = images[images.length - 1];
        addResizeHandle(lastImage.parentElement);
        
        editor.setAttribute('data-modified', 'true');
        debounceSave();
    };
    reader.readAsDataURL(file);
}

// 插入视频
function insertVideo(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const video = document.createElement('video');
        video.src = e.target.result;
        video.controls = true;
        video.style.maxWidth = '100%';
        
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';
        mediaContainer.appendChild(video);
        
        document.execCommand('insertHTML', false, mediaContainer.outerHTML);
        editor.setAttribute('data-modified', 'true');
        debounceSave();
    };
    reader.readAsDataURL(file);
}

// 插入音频
function insertAudio(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const audio = document.createElement('audio');
        audio.src = e.target.result;
        audio.controls = true;
        
        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';
        mediaContainer.appendChild(audio);
        
        document.execCommand('insertHTML', false, mediaContainer.outerHTML);
        editor.setAttribute('data-modified', 'true');
        debounceSave();
    };
    reader.readAsDataURL(file);
}

// 插入文件
function insertFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileAttachment = document.createElement('div');
        fileAttachment.className = 'file-attachment';
        
        // 根据文件类型选择图标
        let iconClass = 'fa-file';
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        if (['doc', 'docx'].includes(fileExt)) iconClass = 'fa-file-word';
        else if (['xls', 'xlsx'].includes(fileExt)) iconClass = 'fa-file-excel';
        else if (['ppt', 'pptx'].includes(fileExt)) iconClass = 'fa-file-powerpoint';
        else if (['pdf'].includes(fileExt)) iconClass = 'fa-file-pdf';
        else if (['zip', 'rar', '7z'].includes(fileExt)) iconClass = 'fa-file-archive';
        else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) iconClass = 'fa-file-image';
        
        fileAttachment.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <a class="file-download" href="${e.target.result}" download="${file.name}">
                <i class="fas fa-download"></i>
            </a>
        `;
        
        document.execCommand('insertHTML', false, fileAttachment.outerHTML);
        editor.setAttribute('data-modified', 'true');
        debounceSave();
    };
    reader.readAsDataURL(file);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 添加调整大小的控件
function addResizeHandle(mediaContainer) {
    const img = mediaContainer.querySelector('img');
    if (!img) return;
    
    // 创建调整大小的控件
    const handles = ['nw', 'ne', 'sw', 'se'];
    handles.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        mediaContainer.appendChild(handle);
    });
    
    // 设置媒体容器为相对定位
    mediaContainer.style.position = 'relative';
    
    // 添加事件监听器
    const resizeHandles = mediaContainer.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });
    
    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = img.offsetWidth;
        const startHeight = img.offsetHeight;
        const handle = e.target;
        
        function resize(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (handle.classList.contains('se')) {
                img.style.width = startWidth + dx + 'px';
                img.style.height = startHeight + dy + 'px';
            } else if (handle.classList.contains('sw')) {
                img.style.width = startWidth - dx + 'px';
                img.style.height = startHeight + dy + 'px';
            } else if (handle.classList.contains('ne')) {
                img.style.width = startWidth + dx + 'px';
                img.style.height = startHeight - dy + 'px';
            } else if (handle.classList.contains('nw')) {
                img.style.width = startWidth - dx + 'px';
                img.style.height = startHeight - dy + 'px';
            }
            
            editor.setAttribute('data-modified', 'true');
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
            debounceSave();
        }
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    }
}

// 生成日历
function generateCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const monthYearText = document.getElementById('calendar-month-year');
    monthYearText.textContent = `${year}年${month + 1}月`;
    
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';
    
    // 获取当月第一天是星期几
    const firstDay = new Date(year, month, 1).getDay();
    
    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 获取上个月的天数
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    let date = 1;
    let nextMonthDate = 1;
    
    // 创建日历行
    for (let i = 0; i < 6; i++) {
        // 如果已经显示完当月所有日期，则停止
        if (date > daysInMonth) {
            break;
        }
        
        const row = document.createElement('tr');
        
        // 创建日历单元格
        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');
            
            if (i === 0 && j < firstDay) {
                // 上个月的日期
                const prevMonthDay = daysInPrevMonth - firstDay + j + 1;
                cell.textContent = prevMonthDay;
                cell.classList.add('prev-month');
            } else if (date > daysInMonth) {
                // 下个月的日期
                cell.textContent = nextMonthDate;
                cell.classList.add('next-month');
                nextMonthDate++;
            } else {
                // 当月的日子
                cell.textContent = date;
                
                // 如果是今天
                if (date === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                    cell.classList.add('today');
                }
                
                // 检查这一天是否有笔记
                const noteDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                const hasNote = notes.some(note => note.date === noteDate);
                
                if (hasNote) {
                    cell.classList.add('has-note');
                }
                
                date++;
            }
            
            row.appendChild(cell);
        }
        
        calendarBody.appendChild(row);
        
        // 如果所有日期都已添加，则停止
        if (date > daysInMonth) {
            break;
        }
    }
}

// 切换日历显示
function toggleCalendar() {
    const calendarContainer = document.querySelector('.calendar-container');
    const toggleIcon = document.querySelector('#calendar-toggle i');
    
    calendarContainer.classList.toggle('collapsed');
    
    if (calendarContainer.classList.contains('collapsed')) {
        toggleIcon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        toggleIcon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// 日历点击处理
function handleCalendarClick(e) {
    if (e.target.tagName === 'TD') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = parseInt(e.target.textContent);
        
        // 检查是否是当前月的日期
        if (!e.target.classList.contains('prev-month') && !e.target.classList.contains('next-month')) {
            const noteDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // 查找当天的笔记
            const dailyNotes = notes.filter(note => note.date === noteDate);
            
            if (dailyNotes.length > 0) {
                // 如果有笔记，选择第一个
                selectNote(dailyNotes[0]);
            } else {
                // 创建新笔记
                const newNote = {
                    id: Date.now(),
                    title: `${year}年${month + 1}月${day}日笔记`,
                    content: `<h2>${year}年${month + 1}月${day}日</h2><p>记录今天的想法...</p>`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    locked: false,
                    password: "",
                    date: noteDate
                };
                
                notes.unshift(newNote);
                renderNotesList();
                selectNote(newNote);
                simulateSave();
            }
        }
    }
}

// 笔记加密功能
function showPasswordModal() {
    document.getElementById('note-password').value = '';
    document.getElementById('confirm-password').value = '';
    passwordModal.style.display = 'flex';
}

function closePasswordModal() {
    passwordModal.style.display = 'none';
}

function setNotePassword() {
    const password = document.getElementById('note-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    if (password.length < 4) {
        alert('密码长度至少为4位');
        return;
    }
    
    currentNote.locked = true;
    currentNote.password = CryptoJS.SHA256(password).toString();
    closePasswordModal();
    renderNotesList();
    alert('笔记已加密');
}

function showUnlockModal() {
    document.getElementById('unlock-password').value = '';
    unlockModal.style.display = 'flex';
}

function closeUnlockModal() {
    unlockModal.style.display = 'none';
}

function unlockNote() {
    const password = document.getElementById('unlock-password').value;
    const hashedPassword = CryptoJS.SHA256(password).toString();
    
    if (hashedPassword === currentNote.password) {
        currentNote.locked = false;
        closeUnlockModal();
        editor.innerHTML = currentNote.content;
        alert('笔记已解锁');
    } else {
        alert('密码错误，请重试');
    }
}

// 导出功能
function showExportModal() {
    exportModal.style.display = 'flex';
}

function closeExportModal() {
    exportModal.style.display = 'none';
}

function exportToPDF() {
    const content = editor.innerHTML;
    const title = currentNote.title;
    
    const opt = {
        margin: 10,
        filename: `${title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.innerHTML = `
        <h1 style="text-align:center; margin-bottom:30px;">${title}</h1>
        <div>${content}</div>
        <div style="margin-top:50px; text-align:right; font-size:12px; color:#666;">
            导出自斜记本 - ${new Date().toLocaleDateString()}
        </div>
    `;
    
    html2pdf()
        .set(opt)
        .from(tempDiv)
        .save();
    
    closeExportModal();
}

function exportToWord() {
    const content = editor.innerHTML;
    const title = currentNote.title;
    
    // 创建一个临时div来保存内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 创建Blob对象
    const blob = new Blob([`
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
        </head>
        <body>
            <h1>${title}</h1>
            ${content}
            <p style="margin-top:50px; text-align:right; font-size:12px; color:#666;">
                导出自斜记本 - ${new Date().toLocaleDateString()}
            </p>
        </body>
        </html>
    `], { type: 'application/msword' });
    
    // 创建下载链接
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    closeExportModal();
}

function exportToHTML() {
    const content = editor.innerHTML;
    const title = currentNote.title;
    
    const blob = new Blob([`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
                h1, h2, h3 { color: #333; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div>${content}</div>
            <div style="margin-top:50px; text-align:right; font-size:12px; color:#666;">
                导出自斜记本 - ${new Date().toLocaleDateString()}
            </div>
        </body>
        </html>
    `], { type: 'text/html' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    closeExportModal();
}

function exportToTXT() {
    const content = editor.innerText;
    const title = currentNote.title;
    
    const blob = new Blob([title + '\n\n' + content], { type: 'text/plain' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    closeExportModal();
}

function exportToMD() {
    const content = editor.innerHTML;
    const title = currentNote.title;
    
    // 使用turndown将HTML转换为Markdown
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(content);
    
    const blob = new Blob([`# ${title}\n\n${markdown}`], { type: 'text/markdown' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    closeExportModal();
}

// 分享功能
function showShareModal() {
    document.getElementById('share-title').value = currentNote.title;
    document.getElementById('share-link').textContent = generateShareLink();
    shareModal.style.display = 'flex';
}

function closeShareModal() {
    shareModal.style.display = 'none';
}

function generateShareLink() {
    // 获取当前页面的URL（不包含查询参数和哈希）
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    // 创建一个唯一标识符
    const randomId = Math.random().toString(36).substring(2, 10);
    // 使用当前笔记的ID和随机ID生成分享链接
    return `${baseUrl}?share=${currentNote.id}&token=${randomId}`;
}

function copyShareLink() {
    const shareLink = document.getElementById('share-link');
    const textArea = document.createElement('textarea');
    textArea.value = shareLink.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // 显示复制成功消息
    const copyBtn = document.getElementById('copy-link');
    const originalIcon = copyBtn.innerHTML;
    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
    
    setTimeout(() => {
        copyBtn.innerHTML = originalIcon;
    }, 2000);
}

// 辅助函数
function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

function countWords(str) {
    return str.trim().length;
}

// 初始化应用
window.addEventListener('DOMContentLoaded', initApp);