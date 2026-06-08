CREATE TABLE Teacher(
 teacher_id CHAR(10) NOT NULL,
 teacher_name VARCHAR NOT NULL,
 email VARCHAR,
 password VARCHAR,
 PRIMARY KEY (teacher_id)
);
CREATE TABLE Student(
 student_id CHAR(10) NOT NULL,
 student_name VARCHAR NOT NULL,
 email VARCHAR,
 password VARCHAR,
 PRIMARY KEY (student_id)
);
CREATE TABLE Course(
 course_id CHAR(10) NOT NULL,
 is_online BOOLEAN,
 course_name VARCHAR NOT NULL,
 semester VARCHAR,
 description VARCHAR,
 PRIMARY KEY (course_id)
);
CREATE TABLE Teaches(
 course_id CHAR(10) NOT NULL,
 teacher_id CHAR(10) NOT NULL,
 PRIMARY KEY (course_id, teacher_id),
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Notification(
 teacher_id CHAR(10),
 notification_id CHAR NOT NULL,
 course_id CHAR(10) NOT NULL,
 type VARCHAR,
 information VARCHAR,
 due_date DATE NOT NULL,
 PRIMARY KEY (notification_id, course_id),
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Receives(
 student_id CHAR(10) NOT NULL,
 notification_id CHAR(10) NOT NULL,
 course_id CHAR(10) NOT NULL,
 PRIMARY KEY (notification_id, course_id,student_id),
 FOREIGN KEY (course_id) REFERENCES Notification(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (student_id) REFERENCES Student(student_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (notification_id) REFERENCES Notification(notification_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Notification_Read(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 student_id CHAR(10) NOT NULL,
 notification_id CHAR(10) NOT NULL,
 course_id CHAR(10) NOT NULL,
 read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(student_id, notification_id, course_id),
 FOREIGN KEY (student_id) REFERENCES Student(student_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (notification_id, course_id) REFERENCES Notification(notification_id, course_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Setting(
 student_id CHAR(10) NOT NULL,
 notification_switch BOOLEAN,
 type VARCHAR NOT NULL,
 PRIMARY KEY (type,student_id),
 FOREIGN KEY (student_id) REFERENCES Student(student_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Enrolls(
 student_id CHAR(10) NOT NULL,
 enrollment_id CHAR(10),
 course_id CHAR(10) NOT NULL,
 grade VARCHAR,
 PRIMARY KEY (course_id,student_id),
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (student_id) REFERENCES Student(student_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Textbook(
 textbook VARCHAR NOT NULL,
 course_id CHAR(10) NOT NULL,
 PRIMARY KEY (course_id,textbook),
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Module(
 module_id CHAR(10) NOT NULL,
 course_id CHAR(10) NOT NULL,
 title VARCHAR,
 description VARCHAR,
 PRIMARY KEY (course_id,module_id),
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE Material(
 module_id CHAR(10) NOT NULL,
 material VARCHAR NOT NULL,
 PRIMARY KEY (material,module_id),
 FOREIGN KEY (module_id) REFERENCES Module(module_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE CourseMaterial(
 material_id CHAR(10) NOT NULL PRIMARY KEY,
 course_id CHAR(10) NOT NULL,
 filename VARCHAR NOT NULL,
 stored_filename VARCHAR NOT NULL,
 uploaded_at TEXT NOT NULL,
 uploaded_by CHAR(10) NOT NULL,
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO Student VALUES ('B0111111111','Amy','B011111111@nsysu.student.edu.tw','Amy111');
INSERT INTO Student VALUES ('B0111111112','Andy','B011111112@nsysu.student.edu.tw','Andy112');
INSERT INTO Teacher VALUES ('T123456789','pclo','T123456789@nsysu.student.edu.tw','T12345pclo');
INSERT INTO Teacher VALUES ('T192837465','Harry','T192837465@nsysu.student.edu.tw','T19283Har');
INSERT INTO Course VALUES ('MIS205', FALSE, '資料庫管理', '114_2', '一堂非常棒的課');
INSERT INTO Course VALUES ('MIS304', FALSE, '管理資訊系統', '114_2', '管理資訊系統核心課程');
INSERT INTO Course VALUES ('MIS206', FALSE, '商事法', '114_2', '商事法基礎概念');
INSERT INTO Course VALUES ('CSS137', TRUE, '資料視覺化', '114_2', '資料視覺化工具與實作');
INSERT INTO Teaches VALUES ('MIS205', 'T123456789');
INSERT INTO Teaches VALUES ('MIS304', 'T192837465');
INSERT INTO Teaches VALUES ('MIS206', 'T123456789');
INSERT INTO Teaches VALUES ('CSS137', 'T192837465');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000001', 'MIS205', '2');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000002', 'MIS304', '3');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000003', 'CSS137', '1');
INSERT INTO Enrolls VALUES ('B0111111112', '0000000004', 'MIS206', '2');
INSERT INTO Enrolls VALUES ('B0111111112', '0000000005', 'MIS304', '3');

INSERT INTO Setting VALUES ('B0111111111', TRUE, '全部通知');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '新公告通知');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '作業通知');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '考試通知');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '課程異動通知');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '討論區回覆');
INSERT INTO Setting VALUES ('B0111111111', TRUE, '成績公告');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '全部通知');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '新公告通知');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '作業通知');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '考試通知');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '課程異動通知');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '討論區回覆');
INSERT INTO Setting VALUES ('B0111111112', TRUE, '成績公告');

INSERT INTO Notification VALUES ('T192837465', 'a', 'MIS304', '一般公告', '大家都A+', '2026-06-11');
INSERT INTO Notification VALUES ('T192837465', 'b', 'MIS304', '作業通知', '作業作業', '2026-06-07');
INSERT INTO Notification VALUES ('T123456789', 'c', 'MIS205', '考試通知', '期末考爆爆王', '2026-06-03');
INSERT INTO Notification VALUES ('T192837465', 'd', 'MIS205', '討論區', 'Do you like coding?', '2026-06-10');