const fs = require('fs');
const path = require('path');

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data.json');
// 写入前的备份文件（保留上一版数据，防止误清/写坏导致用户数据丢失）
const BACKUP_FILE = path.join(__dirname, 'data.json.bak');

// 如果数据文件不存在，初始化一个空数组
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
}

// 读取数据
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('[db] 读取数据文件失败:', err.message);
    // 主文件损坏时，尝试从备份恢复
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
        console.warn('[db] 已从 data.json.bak 恢复数据');
        return backup;
      } catch (e) {
        console.error('[db] 备份文件也无法读取:', e.message);
      }
    }
    return { users: [] };
  }
}

// 写入数据（先备份当前文件，再原子写入临时文件后重命名）
function writeData(data) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      fs.copyFileSync(DATA_FILE, BACKUP_FILE);
    }
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('[db] 写入数据文件失败:', err.message);
  }
}

module.exports = { readData, writeData };
