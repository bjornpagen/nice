# **QTI DDL**

## **Overview**

This document describes the data structure of our QTI (Question and Test Interoperability) assessment system version 3.0. It's designed to help both technical and non-technical users understand how assessment data is organized and stored.

## **Table of Contents**

1. Curriculum  
2. Assessment Tests  
3. Test Parts  
4. Sections  
5. Assessment Items  
6. Relationships  
7. Common Data Types

## **Curriculum**

### **Description**

The curriculum table stores information about educational curricula, which can contain multiple assessment tests.

### **Fields**

| Field Name | Type | Required | Description |
| ----- | ----- | ----- | ----- |
| identifier | Text | Yes | A unique code identifying the curriculum |
| title | Text | Yes | The name of the curriculum |
| subject | Text | Yes | The subject area (e.g., "Mathematics", "Science") |
| gradeLevel | Text | Yes | The target grade level |
| description | Text | No | A detailed description of the curriculum |
| metadata | JSON | No | Additional curriculum information |
| createdAt | Date | Auto | When the curriculum was created |
| updatedAt | Date | Auto | When the curriculum was last updated |

## **Assessment Tests**

### **Description**

Assessment tests are comprehensive exams that contain one or more test parts. They define the overall structure and behavior of the assessment.

### **Fields**

| Field Name | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | Text | Yes | A unique code identifying the test |
| title | Text | Yes | The name of the test |
| qtiVersion | Text | Yes | Version of QTI standard (default: "3.0") |
| toolName | Text | No | Name of the tool used to create the test |
| toolVersion | Text | No | Version of the tool used |
| timeLimit | Number | No | Maximum time allowed (in minutes) |
| maxAttempts | Number | No | Maximum number of attempts allowed |
| toolsEnabled | JSON | No | List of tools available during the test |
| metadata | JSON | No | Additional test information |
| rawXml | Text | Yes | Original QTI XML format |
| content | JSON | Yes | Processed test content |
| qti-test-part | Array | Yes | Array of Test Parts (min: 1\) |
| qti-outcome-declaration | Array | No | Array of outcome declarations for scoring |

### **Validation Rules**

1. Must have at least one test part  
2. Each test part must have at least one section  
3. Identifier and title are required  
4. QTI version defaults to "3.0" if not specified

### **XML Structure**

The assessment test is stored in QTI 3.0 compliant XML format with:

* XML namespace declarations  
* Tool information (optional)  
* Outcome declarations (optional)  
* Test parts with sections and items

## **Test Parts**

### **Description**

Test Parts are major divisions within an Assessment Test that can contain multiple sections. Each Test Part must have navigation and submission settings, and at least one section.

### **Fields**

| Field Name | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | Text | Yes | A unique code identifying the test part |
| navigationMode | Text | Yes | How questions can be accessed (enum) |
| submissionMode | Text | Yes | How answers can be submitted (enum) |
| qti-assessment-section | Array | Yes | Array of sections with their configurations |
| metadata | JSON | No | Additional test part information |

### **Validation Rules**

1. Identifier must be present and unique within the test  
2. Must have at least one section in `qti-assessment-section`  
3. Navigation mode must be either 'linear' or 'nonlinear'  
4. Submission mode must be either 'individual' or 'simultaneous'  
5. Each section must have an identifier, title, and sequence number

## **Sections**

### **Description**

Sections are groups of questions within a test part. They help organize questions into logical groups and can contain references to assessment items.

### **Fields**

| Field Name | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | Text | Yes | A unique code identifying the section |
| title | Text | Yes | The name of the section |
| qti-assessment-item-ref | Array | No | References to assessment items |
| rawXml | Text | Yes | Original QTI XML format |
| metadata | JSON | No | Additional section information |

## **Assessment Items**

### **Description**

Assessment items are individual questions or interactive elements that students engage with. Each item follows the QTI 3.0 specification for structure and behavior.

### **Fields**

| Field Name | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | Text | Yes | A unique code identifying the item |
| title | Text | Yes | The name of the item |
| type | Text | Yes | Type of question/interaction |
| qtiVersion | Text | No | Version of QTI standard (default: "3.0") |
| rawXml | Text | Yes | Original QTI XML format |
| content | JSON | Yes | Processed item content |

## **Common Data Types**

### **Base Types**

* **identifier**: A unique text code  
* **boolean**: True/False value  
* **integer**: Whole number  
* **float**: Decimal number  
* **string**: Text value  
* **duration**: Time period  
* **file**: Uploaded file  
* **uri**: Web link

### **Cardinality Types**

* **single**: One answer only  
* **multiple**: Multiple answers allowed  
* **ordered**: Multiple answers in specific order  
* **record**: Complex structured response

## **Best Practices for Teachers**

1. **Identifiers** should be meaningful and identifiable.  
2. **Titles** should be clear and descriptive.  
3. **Metadata** should include learning objectives, difficulty levels, and special instructions (if including difficulty, the value needs to be “easy”, “medium”, or “hard”).  
4. **Organization** should use logical groupings and clear section titles.  
5. **Question Types** should be chosen appropriately for learning objectives.

## **Technical Implementation Details**

The system uses MongoDB as the database engine, storing data in both QTI-compliant XML and processed JSON formats. This enables both standard compliance and efficient processing.

### **Database Collections**

* `curriculums`: Educational curriculum data  
* `qti-assessment-tests`: Complete test definitions  
* `qti-sections`: Question groupings within tests  
* `qti-assessment-items`: Individual questions/interactions

### **Validation Rules**

1. All documents must have unique identifiers.  
2. XML content must validate against the NQTI 3.0 XSD schema.  
3. Relationships must reference existing documents.  
4. Required fields cannot be null or empty.  
5. Dates must be valid timestamps.

This document provides an extensive reference for implementing and maintaining the QTI Assessment System database.