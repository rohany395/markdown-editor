const container = document.querySelector('.split-pane');
const leftPane = document.querySelector('.pane.left');
const rightPane = document.querySelector('.pane.right');
const wordCountElement = document.querySelector('.word-count');
const readTimeElement = document.querySelector('.read-time');
const performanceElement = document.querySelector('.performance');
const previewElement = document.getElementById('preview');
const editor = document.getElementById('editor');
let isResizing = false;
const parserWorker = new Worker('parser.worker.js');
const allowedTags = ['li','h1', 'h2', 'h3', 'strong', 'em', 'code', 'img', 'a', 'blockquote', 'hr', 'pre'];
const allowedAttributes = {
    'a': ['href'],
    'img': ['src', 'alt']
};
let latestRequestId = 0;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}


document.getElementsByClassName('resize-handle')[0].addEventListener('mousedown', () => {
    isResizing = true;
});

document.addEventListener('mouseup', () => {
    isResizing = false;
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    //requestAnimationFrame to optimize refresh rate performance during resizing
    requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width * 100;

        //clamp percentage between 10% and 90%
        leftPane.style.flex = 'none';
        rightPane.style.flex = 'none'; 
        const clampedPercentage = Math.max(10, Math.min(90, percentage));
        leftPane.style.width = clampedPercentage + '%';
        rightPane.style.width = (100 - clampedPercentage) + '%';
    });
});

editor.addEventListener('keydown', (e)=>{
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();

        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selected = editor.value.substring(start, end);

        editor.value = editor.value.substring(0, start) + '**' + selected + '**' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = end + 4; // Move cursor after the bold syntax
    }
});

//debounce function to limit the rate of preview updates during typing
function debounce(fn,delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this,args);
        }, delay);
     }
}

const debounceHandler = debounce(handleInput, 150);
editor.addEventListener('input', debounceHandler);

function handleInput() {
    const markdownText = editor.value;
    const start = performance.now();
    latestRequestId++;
    
    
    parserWorker.postMessage({ text: markdownText, id: latestRequestId });
    const end = performance.now();
    performanceElement.textContent = `Performance: ${end - start} ms`;

    queueMicrotask(() => {
        const wordCount = markdownText.trim().split(/\s+/).filter(word => word.length > 0).length;
        const readTime = Math.ceil(wordCount / 200);
        console.log(`Word Count: ${wordCount}`);
        wordCountElement.textContent = `Word Count: ${wordCount}`;
        readTimeElement.textContent = `Read Time: ${readTime} mins`;
    });
    saveDraft(markdownText)
};

parserWorker.onmessage = function(e) {
    const { html, id } = e.data;
    if (id !== latestRequestId) return;  // stale result, discard

    requestAnimationFrame(() => {
        previewElement.innerHTML = sanitizeHTML(html);
    });
};

function sanitizeHTML(html) {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    sanitizeNode(tempElement);
    return tempElement.innerHTML;
}

function sanitizeNode(node) {
    const children = Array.from(node.childNodes);

    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toLowerCase();

            if (!allowedTags.includes(tagName)) {
                const text = document.createTextNode(child.textContent);
                node.replaceChild(text, child);
                continue;  // this node is replaced, move to next
            }

            // tag is allowed — now check its attributes
            const attrs = Array.from(child.attributes);
            const tagAllowedAttrs = allowedAttributes[tagName] || [];
            for (const attr of attrs) {
                if (attr.name.startsWith('on')) {
                    child.removeAttribute(attr.name);  // block onclick, onerror, etc.
                    continue;
                }

                if ((attr.name === 'href' || attr.name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                    child.removeAttribute(attr.name);  // block javascript: protocol
                    continue;
                }

                if (!tagAllowedAttrs.includes(attr.name)) {
                    child.removeAttribute(attr.name);
                }
            }

            // recurse into children
            sanitizeNode(child);
        }
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open('markcraft',1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore("drafts");
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function saveDraft(text) {
    const db = await openDB();
    const transaction = db.transaction('drafts', 'readwrite');
    const store = transaction.objectStore('drafts');
    store.put(text, "current-draft");
}

async function loadDraft() {
    const db = await openDB();
    const transaction = db.transaction('drafts', 'readonly');
    const store = transaction.objectStore('drafts');
    
    return new Promise((resolve, reject) => {
        const request = store.get("current-draft");
        request.onsuccess = () => {
            resolve(request.result);
        }   
        request.onerror = () => {
            reject(request.error);
        }
    });
}

async function init() {
    const saved = await loadDraft();
    if (saved) {
        editor.value = saved;
        handleInput();
    }
}

init();