import sqlite3

# 1. 建立或連接到資料庫檔案
conn = sqlite3.connect("project.db")
cursor = conn.cursor()

# 2. 讀取你從 GitHub 下載下來的 SQL 腳本
with open("group5_Database.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

# 3. 核心連結：直接執行整份 SQL 語法建立所有資料表
cursor.executescript(sql_script)

# 4. 提交變更並關閉連線
conn.commit()
conn.close()

print("資料庫連結並初始化成功！")