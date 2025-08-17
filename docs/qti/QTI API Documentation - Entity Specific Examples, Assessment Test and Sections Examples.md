# 1edtech QTI API Assessment Test and Sections Examples

This guide provides examples of how to create, update, delete, search, and additional methods for assessment tests using the 1edtech QTI API.

## **Summary** {#summary}

[**Summary	1**](#summary)

[**Creating Assessment Tests	2**](#creating-assessment-tests)

[JSON Creation Example	2](#json-creation-example)

[XML Creation Example	3](#xml-creation-example)

[**Editing Assessment Test	7**](#editing-assessment-test)

[JSON Example	7](#json-example)

[XML Example	8](#xml-example)

[**Deleting Assessment Test	11**](#deleting-assessment-test)

[**Retrieving an Assessment Test	12**](#retrieving-an-assessment-test)

[Sample JSON Result	12](#sample-json-result)

[Sample XML Result	14](#sample-xml-result)

[**Creating Test Parts	15**](#creating-test-parts)

[Test Part Creation Example	16](#test-part-creation-example)

[**Editing Test Parts	16**](#editing-test-parts)

[Edit Test Part Example	17](#edit-test-part-example)

[**Deleting Test Parts	17**](#deleting-test-parts)

[Delete Test Part Sample Response	18](#delete-test-part-sample-response)

[**Searching Test Parts	18**](#searching-test-parts)

[Test Parts Sample Search Result	19](#test-parts-sample-search-result)

[**Getting a Single Test Part	20**](#getting-a-single-test-part)

[Get a Test Part Sample Response	20](#get-a-test-part-sample-response)

[**Error Responses	20**](#error-responses)

[Example	21](#example)

[**Creating Sections	21**](#creating-sections)

[Sample Section Creation	22](#sample-section-creation)

[**Editing Sections	22**](#editing-sections)

[**Getting Sections	23**](#getting-sections)

[Sample Response	23](#sample-response)

[**Deleting Sections	23**](#deleting-sections)

[**Adding Assessment Items to Section	24**](#adding-assessment-items-to-section)

[Sample Response Body	24](#sample-response-body)

[**Removing Assessment Items from Section	24**](#removing-assessment-items-from-section)

[**Error Responses	25**](#error-responses-1)

[Example	25](#example-1)

## **Creating Assessment Tests** {#creating-assessment-tests}

**Endpoint:**

POST \- [http://qti.alpha-1edtech.com/api/assessment-tests](http://qti.alpha-1edtech.com/api/assessment-tests) 

**Description:**

Sending a POST request to this endpoint will create an assessment test. 

1EdTech validations are verified to guarantee the correct test generation.

**Key Field Clarifications**

*navigationMode*  
Defines how a user navigates (linear vs. nonlinear).

*submissionMode*   
Defines how answers are submitted (individually vs simultaneously).	

*qti-test-part*  
You need to pass at least one test part when creating your test. You can add more test parts later. More on [test parts](#creating-test-parts). 

### JSON Creation Example {#json-creation-example}

**Request Body:**

```
{
  "identifier": "test-001",
  "title": "Basic Math Test",
  "qti-test-part": [
    {
      "identifier": "part-1",
      "navigationMode": "linear",
      "submissionMode": "individual",
      "qti-assessment-section": [
        {
          "identifier": "section-1",
          "title": "Basic Arithmetic",
          "visible": true,
          "required": true,
          "sequence": 1
        }
      ]
    }
  ],
  "qti-outcome-declaration": [
    {
      "identifier": "SCORE",
      "cardinality": "single",
      "baseType": "float"
    }
  ]
}
```

### XML Creation Example {#xml-creation-example}

Set the header: `Content-Type: application/xml`

```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<qti-assessment-test xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                     xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd http://www.w3.org/2001/XInclude https://purl.imsglobal.org/spec/w3/2001/schema/xsd/XInclude.xsd" 
                     xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xi="http://www.w3.org/2001/XInclude" xmlns:m="http://www.w3.org/1998/Math/MathML" 
                     tool-version="0.1" title="BBQs test package" tool-name="Spectatus" identifier="SPECTATUS-GENERATED-TEST">
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="TEST_total">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="SECTION_1_total">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="SECTION_2_total">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="identifier" cardinality="multiple" identifier="TEST_FEEDBACK"/>
    <qti-test-part submission-mode="individual" navigation-mode="nonlinear" identifier="TP">
        <qti-assessment-section title="Section 1 - BBQ items a-m" visible="true" identifier="S1">
            <qti-assessment-item-ref href="id-5c1b1e2d56bd/either-or.xml" identifier="id-5c1b1e2d56bd"/>
            <qti-assessment-item-ref href="id-75bd778a3504/essay-vacation.xml" identifier="id-75bd778a3504"/>
            <qti-assessment-item-ref href="id-992e8bd3c9ac/hotspot-maximum.xml" identifier="id-992e8bd3c9ac"/>
            <qti-assessment-item-ref href="id-f8e13982226c/jumble-gapMatch.xml" identifier="id-f8e13982226c"/>
            <qti-assessment-item-ref href="id-377d71221b04/jumble-inlineChoice.xml" identifier="id-377d71221b04"/>
            <qti-assessment-item-ref href="id-7e4520cd463f/Likert-choice-questionSet.xml" identifier="id-7e4520cd463f"/>
            <qti-assessment-item-ref href="id-2a2cfb9f4dde/Likert-match-questionSet.xml" identifier="id-2a2cfb9f4dde"/>
            <qti-assessment-item-ref href="id-200e2c3f7d76/matching-associate-trigDeriv.xml" identifier="id-200e2c3f7d76"/>
            <qti-assessment-item-ref href="id-7f35b6c393d5/matching-match-trigDeriv.xml" identifier="id-7f35b6c393d5"/>
            <qti-assessment-item-ref href="id-3cd82285401e/MultipleAnswer-choice-materials.xml" identifier="id-3cd82285401e"/>
            <qti-assessment-item-ref href="id-371b0f88774a/MultipleChoice-choice-polynomials.xml" identifier="id-371b0f88774a"/>
        </qti-assessment-section>
        <qti-assessment-section title="Section 2 - BBQ items n-z" visible="true" identifier="id-637f1e66940f">
            <qti-assessment-item-ref href="id-90b59b73c8e4/upload-file.xml" identifier="id-90b59b73c8e4"/>
            <qti-assessment-item-ref href="id-e475c3c922f6/order-maths.xml" identifier="id-e475c3c922f6"/>
            <qti-assessment-item-ref href="id-be3cd3bdd3d4/order-mountains.xml" identifier="id-be3cd3bdd3d4"/>
            <qti-assessment-item-ref href="id-8167235c360b/QuizBowl-multi-geometry.xml" identifier="id-8167235c360b"/>
            <qti-assessment-item-ref href="id-1ccd6e04685f/ShortAnswer-extText-postcard.xml" identifier="id-1ccd6e04685f"/>
            <qti-assessment-item-ref href="id-bd44a757f562/SineRule-001.xml" identifier="id-bd44a757f562"/>
            <qti-assessment-item-ref href="id-13b92f311fc0/SineRule-002-maths.xml" identifier="id-13b92f311fc0"/>
            <qti-assessment-item-ref href="id-c0bdd9a130c7/text_entry-calculus.xml" identifier="id-c0bdd9a130c7"/>
            <qti-assessment-item-ref href="id-d565dbe89933/text_entry-Lycidas.xml" identifier="id-d565dbe89933"/>
            <qti-assessment-item-ref href="id-83210b60ed8f/TF-choice.xml" identifier="id-83210b60ed8f"/>
            <qti-assessment-item-ref href="id-f9f3153e2ba4/TheAnswer-001.xml" identifier="id-f9f3153e2ba4"/>
        </qti-assessment-section>
    </qti-test-part>
    <qti-outcome-processing>
        <qti-set-outcome-value identifier="SECTION_1_total">
            <qti-sum>
                <qti-test-variables base-type="float" section-identifier="S1" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="SECTION_2_total">
            <qti-sum>
                <qti-test-variables base-type="float" section-identifier="id-637f1e66940f" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="TEST_total">
            <qti-sum>
                <qti-test-variables base-type="float" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="TEST_FEEDBACK">
            <qti-multiple>
                <qti-base-value base-type="identifier">S1_END_FB</qti-base-value>
                <qti-base-value base-type="identifier">S2_END_FB</qti-base-value>
                <qti-base-value base-type="identifier">TEST_FB</qti-base-value>
            </qti-multiple>
        </qti-set-outcome-value>
    </qti-outcome-processing>
    <qti-test-feedback outcome-identifier="TEST_FEEDBACK" access="atEnd" show-hide="show" identifier="TEST_FB">
        <qti-content-body>
            <div>You have reached the end of the test.</div>
            <div>Section 1 score: 
                <qti-printed-variable identifier="SECTION_1_total" format="%.1f"/> (from a maximum of 39.0)
            </div>
            <div>Section 2 score: 
                <qti-printed-variable identifier="SECTION_2_total" format="%.1f"/> (from a maximum of 66.0)
            </div>
            <div>Total score: 
                <qti-printed-variable identifier="TEST_total" format="%.1f"/> (from a maximum of 105.0)
            </div>
        </qti-content-body>
    </qti-test-feedback>
</qti-assessment-test>
```

## **Editing Assessment Test** {#editing-assessment-test}

**Endpoint:**

PUT \- https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier

**Description:**

Sending a PUT request to this endpoint will update the assessment test associated with that identifier.

### JSON Example {#json-example}

```
{
  "identifier": "test-001",
  "title": "Basic Math Test",
  "qti-test-part": [
    {
      "identifier": "part-1",
      "navigationMode": "linear",
      "submissionMode": "individual",
      "qti-assessment-section": [
        {
          "identifier": "section-1",
          "title": "Basic Arithmetic",
          "visible": true,
          "required": true,
          "sequence": 1
        }
      ]
    }
  ],
  "qti-outcome-declaration": [
    {
      "identifier": "SCORE",
      "cardinality": "single",
      "baseType": "float"
    }
  ]
}

```

### XML Example {#xml-example}

Set the header: `Content-Type: application/xml`

```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<qti-assessment-test xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                     xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd http://www.w3.org/2001/XInclude https://purl.imsglobal.org/spec/w3/2001/schema/xsd/XInclude.xsd" 
                     xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xi="http://www.w3.org/2001/XInclude" xmlns:m="http://www.w3.org/1998/Math/MathML" 
                     tool-version="0.1" title="BBQs test package" tool-name="Spectatus" identifier="SPECTATUS-GENERATED-TEST">
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="TEST_total">
        <qti-default-value>
            <qti-value>0.12</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="SECTION_1_total">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="float" cardinality="single" identifier="SECTION_2_total">
        <qti-default-value>
            <qti-value>0.0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration base-type="identifier" cardinality="multiple" identifier="TEST_FEEDBACK"/>
    <qti-test-part submission-mode="individual" navigation-mode="nonlinear" identifier="TP">
        <qti-assessment-section title="Section 1 - BBQ items a-m" visible="true" identifier="S1">
            <qti-assessment-item-ref href="id-5c1b1e2d56bd/either-or.xml" identifier="id-5c1b1e2d56bd"/>
            <qti-assessment-item-ref href="id-75bd778a3504/essay-vacation.xml" identifier="id-75bd778a3504"/>
            <qti-assessment-item-ref href="id-992e8bd3c9ac/hotspot-maximum.xml" identifier="id-992e8bd3c9ac"/>
            <qti-assessment-item-ref href="id-f8e13982226c/jumble-gapMatch.xml" identifier="id-f8e13982226c"/>
            <qti-assessment-item-ref href="id-377d71221b04/jumble-inlineChoice.xml" identifier="id-377d71221b04"/>
            <qti-assessment-item-ref href="id-7e4520cd463f/Likert-choice-questionSet.xml" identifier="id-7e4520cd463f"/>
            <qti-assessment-item-ref href="id-2a2cfb9f4dde/Likert-match-questionSet.xml" identifier="id-2a2cfb9f4dde"/>
            <qti-assessment-item-ref href="id-200e2c3f7d76/matching-associate-trigDeriv.xml" identifier="id-200e2c3f7d76"/>
            <qti-assessment-item-ref href="id-7f35b6c393d5/matching-match-trigDeriv.xml" identifier="id-7f35b6c393d5"/>
            <qti-assessment-item-ref href="id-3cd82285401e/MultipleAnswer-choice-materials.xml" identifier="id-3cd82285401e"/>
            <qti-assessment-item-ref href="id-371b0f88774a/MultipleChoice-choice-polynomials.xml" identifier="id-371b0f88774a"/>
        </qti-assessment-section>
        <qti-assessment-section title="Section 2 - BBQ items n-z" visible="true" identifier="id-637f1e66940f">
            <qti-assessment-item-ref href="id-90b59b73c8e4/upload-file.xml" identifier="id-90b59b73c8e4"/>
            <qti-assessment-item-ref href="id-e475c3c922f6/order-maths.xml" identifier="id-e475c3c922f6"/>
            <qti-assessment-item-ref href="id-be3cd3bdd3d4/order-mountains.xml" identifier="id-be3cd3bdd3d4"/>
            <qti-assessment-item-ref href="id-8167235c360b/QuizBowl-multi-geometry.xml" identifier="id-8167235c360b"/>
            <qti-assessment-item-ref href="id-1ccd6e04685f/ShortAnswer-extText-postcard.xml" identifier="id-1ccd6e04685f"/>
            <qti-assessment-item-ref href="id-bd44a757f562/SineRule-001.xml" identifier="id-bd44a757f562"/>
            <qti-assessment-item-ref href="id-13b92f311fc0/SineRule-002-maths.xml" identifier="id-13b92f311fc0"/>
            <qti-assessment-item-ref href="id-c0bdd9a130c7/text_entry-calculus.xml" identifier="id-c0bdd9a130c7"/>
            <qti-assessment-item-ref href="id-d565dbe89933/text_entry-Lycidas.xml" identifier="id-d565dbe89933"/>
            <qti-assessment-item-ref href="id-83210b60ed8f/TF-choice.xml" identifier="id-83210b60ed8f"/>
            <qti-assessment-item-ref href="id-f9f3153e2ba4/TheAnswer-001.xml" identifier="id-f9f3153e2ba4"/>
        </qti-assessment-section>
    </qti-test-part>
    <qti-outcome-processing>
        <qti-set-outcome-value identifier="SECTION_1_total">
            <qti-sum>
                <qti-test-variables base-type="float" section-identifier="S1" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="SECTION_2_total">
            <qti-sum>
                <qti-test-variables base-type="float" section-identifier="id-637f1e66940f" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="TEST_total">
            <qti-sum>
                <qti-test-variables base-type="float" variable-identifier="SCORE"/>
            </qti-sum>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="TEST_FEEDBACK">
            <qti-multiple>
                <qti-base-value base-type="identifier">S1_END_FB</qti-base-value>
                <qti-base-value base-type="identifier">S2_END_FB</qti-base-value>
                <qti-base-value base-type="identifier">TEST_FB</qti-base-value>
            </qti-multiple>
        </qti-set-outcome-value>
    </qti-outcome-processing>
    <qti-test-feedback outcome-identifier="TEST_FEEDBACK" access="atEnd" show-hide="show" identifier="TEST_FB">
        <qti-content-body>
            <div>You have reached the end of the test.</div>
            <div>Section 1 score: <qti-printed-variable identifier="SECTION_1_total" format="%.1f"/> (from a maximum of 39.0)</div>
            <div>Section 2 score: <qti-printed-variable identifier="SECTION_2_total" format="%.1f"/> (from a maximum of 66.0)</div>
            <div>Total score: <qti-printed-variable identifier="TEST_total" format="%.1f"/> (from a maximum of 105.0)</div>
        </qti-content-body>
    </qti-test-feedback>
    <metadata>
        <item>
            <key>aa</key>
            <value>11</value>
        </item>
    </metadata>
</qti-assessment-test>
```

## **Deleting Assessment Test** {#deleting-assessment-test}

**Endpoint:**

DELETE \- https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier

**Description:**

Sending a DELETE request to this endpoint will delete the assessment test associated with that identifier.

The delete will return a status 204 but not a response payload.

## **Retrieving an Assessment Test** {#retrieving-an-assessment-test}

**Endpoint:**

GET \- [http://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier](http://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier) 

**Description:**

Sending a GET request to this endpoint will retrieve the assessment test associated with that identifier.

### 

### Sample JSON Result {#sample-json-result}

```
{
  "_id": "67b3c6ee390c4e1c184d0c4b",
  "identifier": "test-001",
  "title": "Basic Math Test",
  "qtiVersion": "3.0",
  "qti-test-part": [
    {
      "identifier": "part-1",
      "qti-assessment-section": [
        {
          "identifier": "section-1",
          "title": "Basic Arithmetic",
          "visible": true,
          "required": true,
          "fixed": false,
          "sequence": 1,
          "_id": "67b3c6ee390c4e1c184d0c4d",
          "qti-assessment-item-ref": []
        }
      ],
      "submissionMode": "individual",
      "navigationMode": "linear",
      "_id": "67b3c6ee390c4e1c184d0c4c"
    }
  ],
  "qti-outcome-declaration": [
    {
      "identifier": "SCORE",
      "cardinality": "single",
      "baseType": "float",
      "_id": "67b3c6ee390c4e1c184d0c4e"
    }
  ],
  "rawXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"test-001\" title=\"Basic Math Test\">\n  <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\"/>\n  <qti-test-part identifier=\"part-1\" navigation-mode=\"linear\" submission-mode=\"individual\">\n    <qti-assessment-section identifier=\"section-1\" title=\"Basic Arithmetic\" visible=\"true\"/>\n  </qti-test-part>\n</qti-assessment-test>",
  "content": {
    "qti-assessment-test": {
      "xmlns": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0",
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xsi:schemaLocation": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd",
      "identifier": "test-001",
      "title": "Basic Math Test",
      "qti-outcome-declaration": {
        "identifier": "SCORE",
        "cardinality": "single",
        "base-type": "float"
      },
      "qti-test-part": {
        "identifier": "part-1",
        "navigation-mode": "linear",
        "submission-mode": "individual",
        "qti-assessment-section": {
          "identifier": "section-1",
          "title": "Basic Arithmetic",
          "visible": "true"
        }
      }
    }
  },
  "createdAt": "2025-02-17T23:31:58.789Z",
  "updatedAt": "2025-02-17T23:31:58.789Z",
  "__v": 0,
  "isValidXml": true
}

```

### Sample XML Result {#sample-xml-result}

Set the header: `Content-Type: application/xml`

```
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="test-001" title="Basic Math Test">
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
    <qti-test-part identifier="part-1" navigation-mode="linear" submission-mode="individual">
        <qti-assessment-section identifier="section-1" title="Article" visible="true"/>
        <qti-assessment-section identifier="section-2" title="Easy" visible="true"/>
        <qti-assessment-section identifier="section-3" title="Medium" visible="true"/>
        <qti-assessment-section identifier="section-4" title="Hard" visible="true"/>
        <qti-assessment-section identifier="section-2" title="Basic Arithmetic Section" visible="true"/>
    </qti-test-part>
</qti-assessment-test>
```

## **Creating Test Parts** {#creating-test-parts}

By QTI specification, an assessment test may contain **one or more test parts** (at least one is required). A test part is essentially a container within an assessment test that groups together one or more sections (and thereby their items) while defining specific navigation and submission rules (e.g., linear vs. nonlinear, individual vs. simultaneous). This segmentation lets you organize the test into distinct parts with their own scoring and timing parameters. Below is how to create them.

Example Test Part:   
xml

```
<qti-test-part 
identifier="lesson_1" 
title="Lesson 1" 
navigation-mode="linear" 
submission-mode="individual"
>
```

**Endpoint**

POST \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts](https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts) 

**Description**

This endpoint is used to create test parts within an assessment test. The :assessment-test-identifier should be passed in the URL.

1EdTech validations are verified to guarantee the correct test part generation.

### Test Part Creation Example {#test-part-creation-example}

Note: Test parts must contain at least one section; attempts to create a test part without a section will result in a validation error.

Request Body:

```
{
  "identifier": "test-part-1",
  "navigationMode": "linear",
  "submissionMode": "individual",
  "qti-assessment-section": [
    {
      "identifier": "section-1",
      "title": "Default Section",
      "visible": true,
      "required": true,
      "fixed": false,
      "sequence": 1,
      "qti-assessment-item-ref": []
    }
  ]
}
```

## **Editing Test Parts** {#editing-test-parts}

**Endpoint**

PUT \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier) 

Description

This endpoint is used to update an existing test part. Both :assessment-test-identifier and :test-part-identifier should be passed in the URL.

### Edit Test Part Example {#edit-test-part-example}

Request Body:

```
{
  "identifier": "test-part-1",
  "navigationMode": "nonlinear",
  "submissionMode": "simultaneous",
  "qti-assessment-section": [
    {
      "identifier": "updated-section-1",
      "title": "Updated Section",
      "visible": true,
      "required": true,
      "fixed": false,
      "sequence": 1,
      "qti-assessment-item-ref": []
    }
  ]
}
```

## **Deleting Test Parts** {#deleting-test-parts}

**Endpoint**

DELETE \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier) 

**Description**

This endpoint is used to delete a test part from an assessment test. Both :assessment-test-identifier and :test-part-identifier should be passed in the URL.  
The delete will return a success message in the response payload.

### Delete Test Part Sample Response {#delete-test-part-sample-response}

```
{
  "message": "Test part deleted successfully"
}
```

## **Searching Test Parts** {#searching-test-parts}

**Endpoint**

GET \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts](https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts) 

**Description**

This endpoint is used to search for test parts within an assessment test. The :assessment-test-identifier should be passed in the URL.  
Supports filtering, pagination, and sorting.

**Authentication**

Not required.

**Query Parameters**

\- \`navigationMode\`: Filter by navigation mode ('linear' or 'nonlinear')  
\- \`submissionMode\`: Filter by submission mode ('individual' or 'simultaneous')  
\- \`query\`: Text search on identifier  
\- \`page\`: Page number for pagination  
\- \`limit\`: Number of items per page  
\- \`sort\`: Field to sort by  
\- \`order\`: Sort order ('asc' or 'desc')

### Test Parts Sample Search Result {#test-parts-sample-search-result}

```
{
  "items": [
    {
      "identifier": "linear-individual-part",
      "navigationMode": "linear",
      "submissionMode": "individual",
      "qti-assessment-section": [
        {
          "identifier": "section-1",
          "title": "Default Section",
          "visible": true,
          "required": true,
          "fixed": false,
          "sequence": 1,
          "qti-assessment-item-ref": []
        }
      ]
    },
    {
      "identifier": "nonlinear-simultaneous-part",
      "navigationMode": "nonlinear",
      "submissionMode": "simultaneous",
      "qti-assessment-section": [
        {
          "identifier": "section-1",
          "title": "Default Section",
          "visible": true,
          "required": true,
          "fixed": false,
          "sequence": 1,
          "qti-assessment-item-ref": []
        }
      ]
    }
  ],
  "total": 2,
  "page": 1,
  "pages": 1
}
```

## **Getting a Single Test Part** {#getting-a-single-test-part}

**Endpoint**

GET \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessment-test-identifier/test-parts/:test-part-identifier) 

**Description**

This endpoint is used to retrieve a specific test part. Both :assessment-test-identifier and :test-part-identifier should be passed in the URL.

### Get a Test Part Sample Response {#get-a-test-part-sample-response}

```
{
  "identifier": "test-part-1",
  "navigationMode": "linear",
  "submissionMode": "individual",
  "qti-assessment-section": [
    {
      "identifier": "section-1",
      "title": "Default Section",
      "visible": true,
      "required": true,
      "fixed": false,
      "sequence": 1,
      "qti-assessment-item-ref": []
    }
  ]
}
```

## **Error Responses** {#error-responses}

**Not Found (404)**

Returned when:

\- The assessment test does not exist  
\- The test part does not exist

### Example {#example}

```
{
  "error": "Test part not found"
}
```

**Bad Request (400)**

Returned when:

\- Invalid navigation mode  
\- Invalid submission mode  
\- Invalid request data

Example:

```
{
  "error": "Invalid navigation mode"
}
```

## **Creating Sections** {#creating-sections}

**Endpoint**

POST \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections) 

**Description**

Sending a POST request to this endpoint will create a section on the assessment test associated with that identifier. 

**Key Field Clarifications**

*Visible*  
Whether an entity is visible to the user.

*sequence*  
Numerical order in which the entities appear.

### **Sample Section Creation** {#sample-section-creation}

**Request Body:**

```
{
  "identifier": "section-2",
  "title": "Basic Arithmetic Section",
  "visible": true
}
```

## **Editing Sections** {#editing-sections}

**Endpoint**

PUT \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier) 

**Description**

Sending a PUT request to this endpoint will update the section associated with section-identifier on the assessment test associated with assessment-test-identifier.

**Authentication**

Not required.

## **Getting Sections** {#getting-sections}

**Endpoint**

GET \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier) 

**Description**

Sending a GET request to this endpoint will retrieve the section associated with section-identifier on the assessment test associated with assessment-test-identifier.

**Authentication**

Not required.

### **Sample Response** {#sample-response}

```
{
  "identifier": "section-1",
  "title": "Basic Arithmetic",
  "visible": true,
  "required": true,
  "fixed": false,
  "sequence": 1,
  "_id": "67b3c6ee390c4e1c184d0c4d",
  "qti-assessment-item-ref": []
}
```

## **Deleting Sections** {#deleting-sections}

**Endpoint**

DELETE \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/sections/:identifier) 

**Description**

Sending a DELETE request to this endpoint will delete the section associated with section-identifier from the assessment test associated with assessment-test-identifier.  
 The delete will return a status 204 but not a response payload.

**Authentication**

Not required.

## **Adding Assessment Items to Section** {#adding-assessment-items-to-section}

**Endpoint**

POST \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/test-parts/:testPartId/sections/:identifier/items](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/test-parts/:testPartId/sections/:identifier/items) 

**Description**

Sending a POST request to this endpoint will add an assessment item to the section associated with section-identifier on the assessment test associated with assessment-test-identifier.

**Authentication**

Not required.

### Sample Response Body {#sample-response-body}

```
{
  "itemIdentifier": "item-00118"
}
```

## **Removing Assessment Items from Section** {#removing-assessment-items-from-section}

**Endpoint**

DELETE \- [https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/test-parts/:testPartId/sections/:identifier/items/:itemIdentifier](https://qti.alpha-1edtech.com/api/assessment-tests/:assessmentTestId/test-parts/:testPartId/sections/:identifier/items/:itemIdentifier) 

**Description**

Sending a DELETE request to this endpoint will delete the assessment item associated with item-identifier from the section associated with section-identifier on the assessment test associated with assessment-test-identifier.

The delete will return a status 204 but not a response payload.

**Authentication**

Not required.

## **Error Responses** {#error-responses-1}

**Not Found (404)**

Returned when:

* The assessment test does not exist  
* The section does not exist  
* The assessment item does not exist

### Example {#example-1}

```
{
  "error": "Section not found"
}
```

**Bad Request (400)**

Returned when:

* Invalid section data  
* Invalid item data  
* Missing required fields

**Example:**

```
{
  "error": "Invalid section data"
}
```

