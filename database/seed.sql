-- SAMPLE / SEED DATA (100% fictional, for demonstration only)
-- Run after schema.sql:
--   psql -d nsc_ict_system -f database/seed.sql
-- NOTE: user passwords are bcrypt hashes of the plaintext password "Password123!"
-- for EVERY seeded user, so you can log in and test immediately.
-- Hash: $2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO
-- (Generated once and reused below for demo simplicity.)

-- DEPARTMENTS
INSERT INTO departments (name, description) VALUES
('ICT Department', 'Handles all information and communications technology operations'),
('Operations', 'Shipping operations and logistics coordination'),
('Finance', 'Accounts, payroll and budgeting'),
('Human Resources', 'Staff recruitment and welfare'),
('Marine Engineering', 'Vessel engineering and technical support'),
('Administration', 'General administrative services');

-- USERS  (1 admin, 2 ict officers, 3 technicians, 6 staff)
INSERT INTO users (full_name, email, username, password_hash, role, department_id, phone, is_active) VALUES
('Adaeze Okonkwo', 'admin@nscict.local', 'admin', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'admin', 1, '08010000001', TRUE),
('Ibrahim Musa', 'ibrahim.musa@nscict.local', 'ibrahim.musa', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'ict_officer', 1, '08010000002', TRUE),
('Grace Eke', 'grace.eke@nscict.local', 'grace.eke', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'ict_officer', 1, '08010000003', TRUE),
('Chinedu Obi', 'chinedu.obi@nscict.local', 'chinedu.obi', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 1, '08010000004', TRUE),
('Fatima Bello', 'fatima.bello@nscict.local', 'fatima.bello', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 1, '08010000005', TRUE),
('Segun Adewale', 'segun.adewale@nscict.local', 'segun.adewale', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 1, '08010000006', TRUE),
('Ngozi Umeh', 'ngozi.umeh@nscict.local', 'ngozi.umeh', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 2, '08010000007', TRUE),
('Tunde Bakare', 'tunde.bakare@nscict.local', 'tunde.bakare', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 3, '08010000008', TRUE),
('Blessing Nnamdi', 'blessing.nnamdi@nscict.local', 'blessing.nnamdi', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 4, '08010000009', TRUE),
('Emeka Nwosu', 'emeka.nwosu@nscict.local', 'emeka.nwosu', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 5, '08010000010', TRUE),
('Halima Sani', 'halima.sani@nscict.local', 'halima.sani', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 6, '08010000011', TRUE),
('Peter Ojo', 'peter.ojo@nscict.local', 'peter.ojo', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 2, '08010000012', FALSE);

-- ASSETS  (20 records covering all statuses/types)
INSERT INTO assets (asset_tag, asset_type, brand, model, serial_number, department_id, assigned_to, purchase_date, condition, status, location, description) VALUES
('NSC-LAP-001','Laptop','Dell','Latitude 5420','SN-LAP-001',1,2,'2023-02-10','Good','Assigned','ICT Office, 2nd Floor','Assigned to ICT officer for daily operations'),
('NSC-LAP-002','Laptop','HP','EliteBook 840','SN-LAP-002',2,7,'2022-11-05','Good','Assigned','Operations Wing','Field operations laptop'),
('NSC-LAP-003','Laptop','Lenovo','ThinkPad T14','SN-LAP-003',3,8,'2023-06-01','New','Assigned','Finance Office','Finance dept laptop'),
('NSC-LAP-004','Laptop','Dell','Inspiron 15','SN-LAP-004',NULL,NULL,'2021-09-15','Fair','Available','ICT Store','Spare laptop for reassignment'),
('NSC-DSK-001','Desktop','HP','ProDesk 400','SN-DSK-001',4,9,'2022-01-20','Good','Assigned','HR Office','HR workstation'),
('NSC-DSK-002','Desktop','Dell','OptiPlex 3080','SN-DSK-002',5,10,'2022-03-18','Good','Assigned','Marine Eng. Office','Engineering workstation'),
('NSC-DSK-003','Desktop','HP','ProDesk 600','SN-DSK-003',6,11,'2020-07-22','Poor','Under Maintenance','Admin Block','Frequent boot failures'),
('NSC-DSK-004','Desktop','Lenovo','ThinkCentre M720','SN-DSK-004',1,NULL,'2021-05-11','Fair','Available','ICT Store','Reserved for new hires'),
('NSC-PRN-001','Printer','Canon','imageCLASS MF3010',NULL,3,NULL,'2021-08-09','Fair','Active','Finance Office','Shared printer'),
('NSC-PRN-002','Printer','HP','LaserJet Pro M15w',NULL,4,NULL,'2022-10-02','Good','Active','HR Office','Shared printer'),
('NSC-PRN-003','Printer','Epson','L3210',NULL,2,NULL,'2019-04-14','Poor','Damaged','Operations Wing','Paper jam mechanism broken'),
('NSC-SCN-001','Scanner','Canon','CanoScan LiDE 300',NULL,1,NULL,'2020-12-01','Good','Active','ICT Office','Document scanner'),
('NSC-RTR-001','Router','Cisco','RV340',NULL,1,NULL,'2022-02-17','Good','Active','Server Room','Core edge router'),
('NSC-SWT-001','Switch','TP-Link','TL-SG1024',NULL,1,NULL,'2022-02-17','Good','Active','Server Room','Core network switch'),
('NSC-SRV-001','Server','Dell','PowerEdge R440',NULL,1,NULL,'2021-01-10','Good','Active','Server Room','Primary application server'),
('NSC-MON-001','Monitor','Samsung','24" LED',NULL,3,8,'2023-06-01','New','Assigned','Finance Office','Paired with NSC-LAP-003'),
('NSC-UPS-001','UPS','APC','Back-UPS 1500VA',NULL,1,NULL,'2021-11-30','Fair','Active','Server Room','Backup power for server rack'),
('NSC-PRJ-001','Projector','Epson','EB-X41',NULL,6,NULL,'2020-05-05','Poor','Retired','Store Room','Decommissioned - lamp failure'),
('NSC-LAP-005','Laptop','Asus','VivoBook 15','SN-LAP-005',5,NULL,'2019-03-19','Poor','Damaged','ICT Store','Screen cracked, awaiting write-off'),
('NSC-DSK-005','Desktop','HP','ProDesk 400 G6','SN-DSK-005',2,NULL,'2023-01-25','New','Available','ICT Store','Newly procured, not yet assigned');

-- SERVICE REQUESTS
INSERT INTO service_requests (requester_id, department_id, category, subject, description, priority, status, assigned_technician_id, resolution, date_submitted, date_resolved) VALUES
(7, 2, 'Hardware', 'Laptop not powering on', 'My laptop NSC-LAP-002 does not power on after last power outage.', 'High', 'In Progress', 4, NULL, NOW() - INTERVAL '3 days', NULL),
(8, 3, 'Printer', 'Printer paper jam', 'Finance office printer keeps jamming on every print job.', 'Medium', 'Assigned', 5, NULL, NOW() - INTERVAL '2 days', NULL),
(9, 4, 'Network', 'No internet access', 'HR office has no internet connectivity since this morning.', 'Critical', 'Pending', NULL, NULL, NOW() - INTERVAL '1 days', NULL),
(10, 5, 'Software', 'Email not syncing', 'Outlook is not syncing new emails on my desktop.', 'Medium', 'Resolved', 6, 'Reconfigured Outlook profile and reset cached credentials.', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
(11, 6, 'Computer', 'Slow desktop performance', 'Admin block desktop NSC-DSK-003 is extremely slow to boot.', 'Low', 'In Progress', 4, NULL, NOW() - INTERVAL '5 days', NULL),
(7, 2, 'Internet', 'VPN connection failing', 'Cannot connect to company VPN while working remotely.', 'High', 'Resolved', 5, 'Updated VPN client and reissued certificate.', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
(8, 3, 'Email', 'Locked out of email account', 'Repeated password failures locked my email account.', 'Medium', 'Closed', 6, 'Password reset and account unlocked.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
(9, 4, 'Other', 'Request for new monitor', 'Requesting an additional monitor for dual-screen setup.', 'Low', 'Pending', NULL, NULL, NOW() - INTERVAL '6 hours', NULL);

-- MAINTENANCE (linked to assets)
INSERT INTO maintenance (asset_id, technician_id, problem, action_taken, maintenance_date, cost, status, notes) VALUES
(7, 4, 'Desktop fails to boot intermittently', 'Replaced faulty power supply unit', CURRENT_DATE - INTERVAL '4 days', 15000.00, 'Completed', 'Tested for 24 hours, stable'),
(11, 5, 'Printer paper feed mechanism broken', 'Ordered replacement part, pending arrival', CURRENT_DATE - INTERVAL '2 days', 0.00, 'In Progress', 'Part expected in 5 business days'),
(19, 6, 'Screen cracked beyond repair', 'Assessed for write-off, recommended retirement', CURRENT_DATE - INTERVAL '30 days', 0.00, 'Completed', 'Recommended for disposal'),
(18, 4, 'Projector lamp failure', 'Lamp unavailable, unit decommissioned', CURRENT_DATE - INTERVAL '60 days', 0.00, 'Completed', 'Replacement lamp discontinued by manufacturer'),
(3, 5, 'Routine preventive maintenance', 'Cleaned, updated OS and drivers', CURRENT_DATE - INTERVAL '10 days', 2000.00, 'Completed', 'Scheduled quarterly maintenance');

-- AUDIT LOGS (sample historical entries)
INSERT INTO audit_logs (user_id, action, record_type, record_id, details, created_at) VALUES
(1, 'User logged in', 'user', 1, 'Administrator logged in', NOW() - INTERVAL '10 days'),
(2, 'Asset added', 'asset', 1, 'Added asset NSC-LAP-001', NOW() - INTERVAL '9 days'),
(2, 'Asset assigned', 'asset', 2, 'Assigned NSC-LAP-002 to Ngozi Umeh', NOW() - INTERVAL '8 days'),
(1, 'Service request created', 'service_request', 1, 'Request submitted by Ngozi Umeh', NOW() - INTERVAL '3 days'),
(4, 'Request status changed', 'service_request', 1, 'Status changed to In Progress', NOW() - INTERVAL '2 days'),
(1, 'Staff record modified', 'user', 12, 'Deactivated account for Peter Ojo', NOW() - INTERVAL '1 days');
