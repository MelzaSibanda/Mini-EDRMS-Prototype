# Mini EDRMS - Database Schema Documentation

## Overview

This document provides a detailed view of the database schema used in the Mini EDRMS application. While the implementation uses a Key-Value store, it's structured to simulate a relational database with proper foreign key relationships.

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────┐
│        Departments              │
│─────────────────────────────────│
│ 🔑 id          VARCHAR(10)  PK │
│    name        VARCHAR(50)      │
└────────────────┬────────────────┘
                 │
                 │ 1
                 │
                 │ Owns
                 │
                 │ N
                 │
┌────────────────▼────────────────┐         ┌─────────────────────────────────┐
│         Documents               │         │       DocumentTypes             │
│─────────────────────────────────│         │─────────────────────────────────│
│ 🔑 id          VARCHAR(10)  PK │         │ 🔑 id          VARCHAR(10)  PK │
│    title       VARCHAR(200)     │         │    name        VARCHAR(50)      │
│ 🔗 typeId      VARCHAR(10)  FK ├─────────┤                                 │
│ 🔗 deptId      VARCHAR(10)  FK │         └─────────────────────────────────┘
│    dateCreated DATE             │                        1
│    status      VARCHAR(20)      │                        │
│    ownerName   VARCHAR(100)     │                        │ Classifies
└─────────────────────────────────┘                        │
                                                            │ N
                                                            │

Legend:
🔑 = Primary Key
🔗 = Foreign Key
PK = Primary Key
FK = Foreign Key
1  = One (Cardinality)
N  = Many (Cardinality)
```

---

## Table Definitions

### 1. Departments Table

**Purpose:** Reference table for organizational departments

**Storage Key Pattern:** `dept:{id}`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique department identifier |
| name | VARCHAR(50) | NOT NULL | Department name |

**Sample Data:**
```sql
INSERT INTO Departments (id, name) VALUES
('1', 'HR'),
('2', 'Finance'),
('3', 'IT'),
('4', 'Operations');
```

**SQL Equivalent:**
```sql
CREATE TABLE Departments (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
```

---

### 2. DocumentTypes Table

**Purpose:** Reference table for document classification

**Storage Key Pattern:** `doctype:{id}`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique type identifier |
| name | VARCHAR(50) | NOT NULL | Document type name |

**Sample Data:**
```sql
INSERT INTO DocumentTypes (id, name) VALUES
('1', 'Policy'),
('2', 'Contract'),
('3', 'Invoice'),
('4', 'Evaluation Report');
```

**SQL Equivalent:**
```sql
CREATE TABLE DocumentTypes (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
```

---

### 3. Documents Table

**Purpose:** Main entity storing document records

**Storage Key Pattern:** `doc:{id}`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(10) | PRIMARY KEY, NOT NULL | Unique document identifier |
| title | VARCHAR(200) | NOT NULL | Document title |
| typeId | VARCHAR(10) | FOREIGN KEY → DocumentTypes(id), NOT NULL | Document classification |
| deptId | VARCHAR(10) | FOREIGN KEY → Departments(id), NOT NULL | Owning department |
| dateCreated | DATE | NOT NULL | Document creation date |
| status | VARCHAR(20) | NOT NULL | Current document status |
| ownerName | VARCHAR(100) | NOT NULL | Document owner's name |

**Valid Status Values:**
- `Draft` - Document is being prepared
- `Submitted` - Document submitted for review
- `Approved` - Document has been approved
- `Archived` - Document is archived

**Sample Data:**
```sql
INSERT INTO Documents (id, title, typeId, deptId, dateCreated, status, ownerName) VALUES
('1', 'Employee Handbook 2026', '1', '1', '2026-01-15', 'Approved', 'Sarah Johnson'),
('2', 'Q4 2025 Financial Report', '4', '2', '2026-01-20', 'Approved', 'Michael Chen'),
('3', 'Software License Agreement', '2', '3', '2026-02-01', 'Submitted', 'David Kumar'),
('4', 'Office Supplies Invoice - January', '3', '4', '2026-02-05', 'Approved', 'Emma Williams'),
('5', 'Remote Work Policy Draft', '1', '1', '2026-02-10', 'Draft', 'Sarah Johnson'),
('6', 'Network Security Assessment', '4', '3', '2026-02-11', 'Submitted', 'David Kumar');
```

**SQL Equivalent:**
```sql
CREATE TABLE Documents (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    typeId VARCHAR(10) NOT NULL,
    deptId VARCHAR(10) NOT NULL,
    dateCreated DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    ownerName VARCHAR(100) NOT NULL,
    FOREIGN KEY (typeId) REFERENCES DocumentTypes(id),
    FOREIGN KEY (deptId) REFERENCES Departments(id),
    CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Archived'))
);
```

---

## Relationships

### 1. Departments → Documents (One-to-Many)

**Relationship Type:** One department can have many documents

**Foreign Key:** `Documents.deptId` → `Departments.id`

**Cardinality:** 1:N

**Business Rule:** Every document must belong to exactly one department

**Example Query:**
```sql
-- Get all documents for IT department
SELECT d.*
FROM Documents d
JOIN Departments dept ON d.deptId = dept.id
WHERE dept.name = 'IT';
```

**Interview Explanation:**
> "This is a one-to-many relationship. One department, like 'IT', can own many documents, but each document belongs to exactly one department. The foreign key deptId in the Documents table references the primary key id in the Departments table, ensuring referential integrity."

---

### 2. DocumentTypes → Documents (One-to-Many)

**Relationship Type:** One document type can classify many documents

**Foreign Key:** `Documents.typeId` → `DocumentTypes.id`

**Cardinality:** 1:N

**Business Rule:** Every document must have exactly one type

**Example Query:**
```sql
-- Get all Policy documents
SELECT d.*
FROM Documents d
JOIN DocumentTypes dt ON d.typeId = dt.id
WHERE dt.name = 'Policy';
```

**Interview Explanation:**
> "This is another one-to-many relationship. A single document type, such as 'Policy', can classify multiple documents, but each document has only one type. The typeId foreign key ensures that we can't assign an invalid or non-existent document type to a document."

---

## Common Queries

### 1. Retrieve All Documents with Related Data

**Business Need:** Display complete document information with department and type names

```sql
SELECT 
    d.id,
    d.title,
    dt.name AS typeName,
    dept.name AS departmentName,
    d.dateCreated,
    d.status,
    d.ownerName
FROM Documents d
LEFT JOIN Departments dept ON d.deptId = dept.id
LEFT JOIN DocumentTypes dt ON d.typeId = dt.id
ORDER BY d.dateCreated DESC;
```

**Result:**
| id | title | typeName | departmentName | dateCreated | status | ownerName |
|----|-------|----------|----------------|-------------|--------|-----------|
| 6 | Network Security Assessment | Evaluation Report | IT | 2026-02-11 | Submitted | David Kumar |
| 5 | Remote Work Policy Draft | Policy | HR | 2026-02-10 | Draft | Sarah Johnson |
| ... | ... | ... | ... | ... | ... | ... |

---

### 2. Search Documents by Department and Status

**Business Need:** Filter documents based on multiple criteria

```sql
SELECT 
    d.id,
    d.title,
    dt.name AS typeName,
    dept.name AS departmentName,
    d.status
FROM Documents d
JOIN Departments dept ON d.deptId = dept.id
JOIN DocumentTypes dt ON d.typeId = dt.id
WHERE dept.id = '3'  -- IT Department
  AND d.status = 'Submitted'
ORDER BY d.dateCreated DESC;
```

**Result:**
| id | title | typeName | departmentName | status |
|----|-------|----------|----------------|--------|
| 6 | Network Security Assessment | Evaluation Report | IT | Submitted |
| 3 | Software License Agreement | Contract | IT | Submitted |

---

### 3. Get Statistics by Department

**Business Need:** Dashboard showing document count per department

```sql
SELECT 
    dept.name AS departmentName,
    COUNT(d.id) AS documentCount
FROM Departments dept
LEFT JOIN Documents d ON dept.id = d.deptId
GROUP BY dept.id, dept.name
ORDER BY documentCount DESC;
```

**Result:**
| departmentName | documentCount |
|----------------|---------------|
| HR | 2 |
| IT | 2 |
| Finance | 1 |
| Operations | 1 |

---

### 4. Get Statistics by Status

**Business Need:** Dashboard showing document count per status

```sql
SELECT 
    status,
    COUNT(*) AS count
FROM Documents
GROUP BY status
ORDER BY count DESC;
```

**Result:**
| status | count |
|--------|-------|
| Approved | 3 |
| Submitted | 2 |
| Draft | 1 |
| Archived | 0 |

---

### 5. Get Single Document Details

**Business Need:** View complete information for a specific document

```sql
SELECT 
    d.id,
    d.title,
    dt.name AS typeName,
    d.typeId,
    dept.name AS departmentName,
    d.deptId,
    d.dateCreated,
    d.status,
    d.ownerName
FROM Documents d
JOIN Departments dept ON d.deptId = dept.id
JOIN DocumentTypes dt ON d.typeId = dt.id
WHERE d.id = '1';
```

**Result:**
| id | title | typeName | typeId | departmentName | deptId | dateCreated | status | ownerName |
|----|-------|----------|--------|----------------|--------|-------------|--------|-----------|
| 1 | Employee Handbook 2026 | Policy | 1 | HR | 1 | 2026-01-15 | Approved | Sarah Johnson |

---

## Database Normalization

### Normalization Level: Third Normal Form (3NF)

The database design follows normalization principles:

#### First Normal Form (1NF)
✅ Each column contains atomic values (no lists or arrays)  
✅ Each row is unique (primary keys)  
✅ No repeating groups

#### Second Normal Form (2NF)
✅ Meets 1NF requirements  
✅ All non-key attributes depend on the entire primary key  
✅ No partial dependencies

#### Third Normal Form (3NF)
✅ Meets 2NF requirements  
✅ No transitive dependencies  
✅ Department and DocumentType information is stored in separate tables

**Example of Normalization:**

❌ **Bad Design (Not Normalized):**
```
Documents
├─ id: 1
├─ title: "Employee Handbook 2026"
├─ typeName: "Policy"              ← Duplicated across many records
├─ departmentName: "HR"            ← Duplicated across many records
├─ dateCreated: "2026-01-15"
└─ ownerName: "Sarah Johnson"
```

✅ **Good Design (Normalized):**
```
Documents                   DocumentTypes         Departments
├─ id: 1                   ├─ id: 1              ├─ id: 1
├─ title: "Employee..."    └─ name: "Policy"     └─ name: "HR"
├─ typeId: 1 (FK) ─────────┘
├─ deptId: 1 (FK) ─────────────────────────────────┘
├─ dateCreated: "2026-01-15"
└─ ownerName: "Sarah Johnson"
```

**Benefits:**
- **Reduced Redundancy:** "HR" and "Policy" stored once, not in every document
- **Data Integrity:** Change department name in one place, applies everywhere
- **Storage Efficiency:** Less duplication means smaller database
- **Easier Maintenance:** Update reference data without touching all documents

---

## Referential Integrity

### Foreign Key Constraints

The system enforces referential integrity through foreign key validation:

#### 1. Cannot Insert Invalid Department Reference

```sql
-- ❌ This will fail
INSERT INTO Documents (id, title, typeId, deptId, dateCreated, status, ownerName)
VALUES ('7', 'New Document', '1', '99', '2026-02-12', 'Draft', 'John Doe');

-- Error: Foreign key constraint violation
-- Department with id '99' does not exist
```

#### 2. Cannot Insert Invalid Document Type Reference

```sql
-- ❌ This will fail
INSERT INTO Documents (id, title, typeId, deptId, dateCreated, status, ownerName)
VALUES ('7', 'New Document', '99', '1', '2026-02-12', 'Draft', 'John Doe');

-- Error: Foreign key constraint violation
-- DocumentType with id '99' does not exist
```

#### 3. Successful Insert with Valid References

```sql
-- ✅ This succeeds
INSERT INTO Documents (id, title, typeId, deptId, dateCreated, status, ownerName)
VALUES ('7', 'New Policy Document', '1', '3', '2026-02-12', 'Draft', 'John Doe');

-- Success: Both typeId='1' (Policy) and deptId='3' (IT) exist
```

---

## Indexing Strategy (For Interview Discussion)

If this were a production SQL database, you would add indexes:

```sql
-- Primary keys are automatically indexed

-- Add index on frequently searched columns
CREATE INDEX idx_documents_status ON Documents(status);
CREATE INDEX idx_documents_deptId ON Documents(deptId);
CREATE INDEX idx_documents_typeId ON Documents(typeId);
CREATE INDEX idx_documents_dateCreated ON Documents(dateCreated);

-- Composite index for common search combinations
CREATE INDEX idx_documents_dept_status ON Documents(deptId, status);
```

**Why?**
- Faster search queries (WHERE clauses)
- Faster JOIN operations
- Faster sorting (ORDER BY)
- Trade-off: Slower inserts, more storage

---

## Data Dictionary

### Complete Field Reference

| Table | Field | Type | Nullable | Default | Description | Example |
|-------|-------|------|----------|---------|-------------|---------|
| Departments | id | VARCHAR(10) | NO | - | Unique identifier | "1" |
| Departments | name | VARCHAR(50) | NO | - | Department name | "HR" |
| DocumentTypes | id | VARCHAR(10) | NO | - | Unique identifier | "1" |
| DocumentTypes | name | VARCHAR(50) | NO | - | Type name | "Policy" |
| Documents | id | VARCHAR(10) | NO | - | Unique identifier | "1" |
| Documents | title | VARCHAR(200) | NO | - | Document title | "Employee Handbook 2026" |
| Documents | typeId | VARCHAR(10) | NO | - | FK to DocumentTypes | "1" |
| Documents | deptId | VARCHAR(10) | NO | - | FK to Departments | "1" |
| Documents | dateCreated | DATE | NO | - | Creation date | "2026-01-15" |
| Documents | status | VARCHAR(20) | NO | - | Current status | "Approved" |
| Documents | ownerName | VARCHAR(100) | NO | - | Owner's name | "Sarah Johnson" |

---

## Interview Talking Points

### When Asked: "Explain your database design"

> "I designed a normalized relational database with three tables following Third Normal Form principles. The Documents table is the main entity, with two foreign keys referencing lookup tables: Departments and DocumentTypes. This normalization eliminates data redundancy - instead of storing 'HR' in every document record, I store a reference to the Departments table where 'HR' is defined once.
>
> The relationships are both one-to-many: one department can own many documents, and one document type can classify many documents. I enforce referential integrity through foreign key constraints, which prevent orphaned records and ensure data consistency."

### When Asked: "What are foreign keys and why use them?"

> "Foreign keys establish relationships between tables. In my design, the Documents table has two foreign keys: typeId references DocumentTypes, and deptId references Departments. 
>
> Foreign keys provide three main benefits:
> 1. **Referential Integrity** - You can't create a document for a department that doesn't exist
> 2. **Data Consistency** - If we rename 'HR' to 'Human Resources', it automatically updates everywhere
> 3. **Normalization** - We avoid duplicating department names across thousands of documents, saving storage and reducing update anomalies"

### When Asked: "How do JOINs work in your queries?"

> "JOINs allow me to combine data from multiple related tables. For example, when displaying a document, I need to show the department name, not just the ID. I use a LEFT JOIN to combine Documents with Departments based on the foreign key relationship.
>
> The query looks like: `SELECT d.*, dept.name FROM Documents d LEFT JOIN Departments dept ON d.deptId = dept.id`. This retrieves all document data plus the resolved department name, providing complete information to the user."

---

## Summary

This database schema demonstrates:
- ✅ **Proper Normalization** (3NF)
- ✅ **Foreign Key Relationships**
- ✅ **Referential Integrity**
- ✅ **One-to-Many Relationships**
- ✅ **Efficient Data Storage**
- ✅ **Real-world Application Design**

Perfect for demonstrating database design knowledge in a graduate IT interview!
