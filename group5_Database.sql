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
 material_id CHAR(10) NOT NULL PRIMARY KEY,
 course_id CHAR(10) NOT NULL,
 filename VARCHAR NOT NULL,
 stored_filename VARCHAR NOT NULL,
 uploaded_at TEXT NOT NULL,
 uploaded_by CHAR(10) NOT NULL,
 FOREIGN KEY (course_id) REFERENCES Course(course_id)
 ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY (module_id) REFERENCES Module(module_id)
 ON DELETE SET NULL
);
INSERT INTO Student VALUES ('B0111111111','Amy','B011111111@nsysu.student.edu.tw','Amy111');
INSERT INTO Student VALUES ('B0111111112','Andy','B011111112@nsysu.student.edu.tw','Andy112');
INSERT INTO Teacher VALUES ('T123456789','pclo','T123456789@nsysu.student.edu.tw','T12345pclo');
INSERT INTO Teacher VALUES ('T192837465','Harry','T192837465@nsysu.student.edu.tw','T19283Har');
INSERT INTO Course VALUES ('MIS205', FALSE, 'Database Management', '114_2', 'an excellent class');
INSERT INTO Course VALUES ('MIS304', FALSE, 'Management Information Systems', '114_2', 'Core course in Management Information Systems');
INSERT INTO Course VALUES ('MIS206', FALSE, 'Commercial Law', '114_2', 'Basic concepts of Commercial Law');
INSERT INTO Course VALUES ('CSS137', TRUE, 'Data Visualization', '114_2', 'Tools and Practice of Data Visualization');
INSERT INTO Teaches VALUES ('MIS205', 'T123456789');
INSERT INTO Teaches VALUES ('MIS304', 'T192837465');
INSERT INTO Teaches VALUES ('MIS206', 'T123456789');
INSERT INTO Teaches VALUES ('CSS137', 'T192837465');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000001', 'MIS205', '2');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000002', 'MIS304', '3');
INSERT INTO Enrolls VALUES ('B0111111111', '0000000003', 'CSS137', '1');
INSERT INTO Enrolls VALUES ('B0111111112', '0000000004', 'MIS206', '2');
INSERT INTO Enrolls VALUES ('B0111111112', '0000000005', 'MIS304', '3');

INSERT INTO Setting VALUES ('B0111111111', TRUE, 'all');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'announcement');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'assignment');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'exam');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'courses_change');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'discussion');
INSERT INTO Setting VALUES ('B0111111111', TRUE, 'scores');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'all');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'announcement');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'assignment');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'exam');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'courses_change');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'discussion');
INSERT INTO Setting VALUES ('B0111111112', TRUE, 'scores');

INSERT INTO Notification VALUES ('T123456789', 'a', 'MIS304', 'announcement', 'Everyone got an A+', '2026-06-11');
INSERT INTO Notification VALUES ('T123456789', 'b', 'MIS304', 'assignment', 'Homework', '2026-06-07');
INSERT INTO Notification VALUES ('T123456789', 'c', 'MIS205', 'exam', 'Crazy final exam', '2026-06-03');
INSERT INTO Notification VALUES ('T123456789', 'd', 'MIS205', 'discussion', 'Do you like coding?', '2026-06-10');
INSERT INTO Notification VALUES ('T123456789', 'e', 'MIS205', 'courses_change', 'The final project was canceled, yay~~', '2026-06-10');