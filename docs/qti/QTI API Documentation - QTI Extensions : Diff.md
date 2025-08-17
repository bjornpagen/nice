# **QTI 3.0 Assessment Engine API Extensions**

This implementation extends the QTI 3.0 specification to provide a RESTful API for managing assessment content. It focuses on the Curriculum, Assessment Test, Section, and Item components of the QTI specification, providing CRUD operations and search capabilities for educational content management systems.

## API Extensions

The base QTI spec defines XML formats for assessment content but doesn't specify how to manage this content programmatically. These routes enable content authors and systems to create, retrieve, update, and delete QTI-compliant assessment materials via REST APIs.

### Create/Edit/Delete Routes

```
## Curricula

### Search curricula
GET /curricula
Authorization: Bearer <token>

### Get specific curriculum
GET /curricula/:identifier
Authorization: Bearer <token>

### Create curriculum
POST /curricula
Authorization: Bearer <token>

### Update curriculum
PUT /curricula/:identifier
Authorization: Bearer <token>

### Delete curriculum
DELETE /curricula/:identifier
Authorization: Bearer <token>


## Assessment Tests

### Search assessment tests
GET /assessment-tests
Authorization: Bearer <token>

### Get specific test
GET /assessment-tests/:identifier
Authorization: Bearer <token>

### Create assessment test
POST /assessment-tests
Authorization: Bearer <token>

### Update assessment test
PUT /assessment-tests/:identifier
Authorization: Bearer <token>

### Delete assessment test
DELETE /assessment-tests/:identifier
Authorization: Bearer <token>

## Assessment Items

### Search assessment items
GET /assessment-items
Authorization: Bearer <token>

### Get specific item
GET /assessment-items/:identifier
Authorization: Bearer <token>

### Create assessment item
POST /assessment-items
Authorization: Bearer <token>

### Update assessment item
PUT /assessment-items/:identifier
Authorization: Bearer <token>

### Delete assessment item
DELETE /assessment-items/:identifier
Authorization: Bearer <token>

## Curriculum-Test Management

### Add test to curriculum
POST /curricula/:identifier/tests
Authorization: Bearer <token>

### Remove test from curriculum
DELETE /curricula/:identifier/tests/:testId
Authorization: Bearer <token>

### Update test sequence in curriculum
PUT /curricula/:identifier/tests/:testId/sequence
Authorization: Bearer <token>

## Assessment Tests Sections Management

### Search sections in assessment test
GET /assessment-tests/:identifier/sections
Authorization: Bearer <token>

### Get specific section in assessment test
GET /assessment-tests/:identifier/sections/:sectionId
Authorization: Bearer <token>

### Create section for assessment test
POST /assessment-tests/:identifier/sections
Authorization: Bearer <token>

### Update section in assessment test
PUT /assessment-tests/:identifier/sections/:sectionId
Authorization: Bearer <token>

### Delete section from assessment test
DELETE /assessment-tests/:identifier/sections/:sectionId
Authorization: Bearer <token>

## Assessment Test Section-Item Management

### Add item to section in assessment test
POST /assessment-tests/:identifier/sections/:sectionId/items
Authorization: Bearer <token>

### Remove item from section in assessment test
DELETE /assessment-tests/:identifier/sections/:sectionId/items/:itemId
Authorization: Bearer <token>

### Update item sequence in section in assessment test
PUT /assessment-tests/:identifier/sections/:sectionId/items/:itemId/sequence
Authorization: Bearer <token>

```

