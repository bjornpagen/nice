# 1edtech QTI API Assessment Items Examples

This guide provides examples of how to update, delete, search for assessment items using the 1edtech QTI API.

[**Creating Assessment Items**](#creating-assessment-items)

[**Creating Assessment Items with Simplified JSON**](#creating-assessment-items-with-simplified-json)

[A. Creating a Choice Question Example](#a.-creating-a-choice-question-example)

[B. Creating a Text Entry Question Example](#b.-creating-a-text-entry-question-example)

[**Creating Assessment Items with XML**](#creating-assessment-items-with-xml)

[Accepted HTML Tags](#accepted-html-tags)

[**Editing an Assessment Item**](#editing-an-assessment-item)

[JSON Example](#json-example)

[**Deleting an Assessment Item**](#deleting-an-assessment-item)

[**Retrieving an Assessment Item**](#retrieving-an-assessment-item)

[Sample JSON Result](#sample-json-result)

[Sample XML Result](#sample-xml-result)

[**Base JSON for Assessment Items**](#base-json-for-assessment-items)

[Associate Interaction (Assessment Item type: "associate")](#associate-interaction-\(assessment-item-type:-"associate"\))

[Text Entry Interaction (Assessment Item type: "text-entry")](#text-entry-interaction-\(assessment-item-type:-"text-entry"\))

[Choice Interaction (Assessment Item type: "choice")](#choice-interaction-\(assessment-item-type:-"choice"\))

[Extended Text Interaction (Assessment Item type: "extended-text")](#extended-text-interaction-\(assessment-item-type:-"extended-text"\))

[Match Interaction (Assessment Item type: "match")](#match-interaction-\(assessment-item-type:-"match"\))

[Hotspot Interaction (Assessment Item type: "hotspot")](#hotspot-interaction-\(assessment-item-type:-"hotspot"\))

[Order Interaction (Assessment Item type: "order")](#order-interaction-\(assessment-item-type:-"order"\))

[Inline Choice Interaction (Assessment Item type: "inline-choice")](#inline-choice-interaction-\(assessment-item-type:-"inline-choice"\))

[Select Point Interaction (Assessment Item type: "select-point")](#select-point-interaction-\(assessment-item-type:-"select-point"\))

[Slider Interaction (Assessment Item type: "slider")](#slider-interaction-\(assessment-item-type:-"slider"\))

[Upload Interaction (Assessment Item type: "upload")](#upload-interaction-\(assessment-item-type:-"upload"\))

[Media Interaction (Assessment Item type: "media")](#media-interaction-\(assessment-item-type:-"media"\))

[Drawing Interaction (Assessment Item type: "drawing")](#drawing-interaction-\(assessment-item-type:-"drawing"\))

[Graphic Associate Interaction (Assessment Item type: "graphic-associate")](#graphic-associate-interaction-\(assessment-item-type:-"graphic-associate"\))

[Graphic Order Interaction (Assessment Item type: "graphic-order")](#graphic-order-interaction-\(assessment-item-type:-"graphic-order"\))

## 

## Creating Assessment Items {#creating-assessment-items}

**Endpoint:**

POST \- [https://qti.alpha-1edtech.com/api/assessment-items](https://qti.alpha-1edtech.com/api/assessment-items) 

**Description:**

Sending a POST request to this endpoint will create an assessment item. 

### Creating Assessment Items with Simplified JSON {#creating-assessment-items-with-simplified-json}

#### A. Creating a Choice Question Example {#a.-creating-a-choice-question-example}

**Purpose:** Present multiple choices (single or multiple correct answers).

```
{
  "type": "choice",
  "identifier": "item-001",
  "title": "An Unbelievable Night Event",
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "standard": "Reading Comprehension",
    "lesson": "Identifying Key Events and Details",
    "difficulty": "medium"
  },
  "interaction": {
    "type": "choice",
    "responseIdentifier": "RESPONSE",
    "shuffle": false,
    "maxChoices": 1,
    "questionStructure": {
      "prompt": "What unexpected event occurred in the hallway after Anina used the magazine's flamingo picture?",
      "choices": [
        {
          "identifier": "A",
          "content": "The crocodile immediately left the apartment."
        },
        {
          "identifier": "B",
          "content": "The hallway filled with screeching, flapping flamingos."
        },
        {
          "identifier": "C",
          "content": "The telephone stand toppled over."
        },
        {
          "identifier": "D",
          "content": "Her mother's hat reappeared on the hook."
        }
      ]
    }
  },
  "responseDeclarations": [
    {
    "identifier": "RESPONSE",
    "cardinality": "single",
    "baseType": "identifier",
    "correctResponse": {
      "value": [
        "B"
      ]
    }
  }
  ],
  "responseProcessing": {
    "templateType": "match_correct"
  }
}

```

#### B. Creating a Text Entry Question Example {#b.-creating-a-text-entry-question-example}

**Purpose:** Simple text input, often used for short answers.

```
{
  "type": "text-entry",
  "identifier": "item-2",
  "title": "Barricade Object Identification",
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "standard": "Reading Comprehension",
    "lesson": "Identifying Key Details in Narrative Texts",
    "difficulty": "medium"
  },
  "preInteraction": "<p>After the crocodile caused chaos in the hallway, Anina quickly retreated to her bedroom. She slammed the door shut and grabbed her </p>",
  "interaction": {
    "type": "text-entry",
    "responseIdentifier": "RESPONSE",
    "attributes": {
      "expected-length": 3,
      "pattern-mask": "[A-Za-z]+",
      "placeholder": "Enter object name"
    },
    "questionStructure": {
      "prompt": ""
    }
  },
  "postInteraction": "<p>to push against the door, creating a barricade against the crocodile.</p>",
  "responseDeclarations": [
    {
    "identifier": "RESPONSE",
    "cardinality": "single",
    "baseType": "string",
    "correctResponse": {
      "value": [
        "bed"
      ]
    }
  }
  ],
  "rubrics": [
    {
      "use": "ext:solution",
      "view": "candidate",
      "body": "<p>Step-by-Step Solution:</p><ol><li>Read the complete text, including the preInteraction and postInteraction HTML, to understand the context.</li><li>Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li>Recall that the narrative mentions Anina grabbed her bed to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol>"
    },
    {
      "use": "ext:explanation",
      "view": "scorer",
      "body": "<p>Full Explanation:</p><p>The correct answer is <strong>bed</strong> because the passage describes Anina retreating to her bedroom and using an object to barricade the door against the crocodile. The text explicitly indicates that she grabbed her bed to push against the door, ensuring her safety. This context confirms that the missing word is 'bed'.</p>"
    },
    {
      "use": "ext:criteria",
      "view": "scorer",
      "body": "<p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly identify the missing object as 'bed'.</li><li>The solution should follow a logical, step-by-step reasoning process based on the text.</li><li>The explanation must clearly justify why 'bed' is the appropriate answer by referencing the narrative context.</li><li>Partial credit may be awarded for responses that indicate the correct idea but lack full explanation.</li></ul>"
    }
  ],
  "stimulus": {
   "identifier": "Stimulus1"
 }
}
```

### Creating Assessment Items with XML {#creating-assessment-items-with-xml}

**Endpoint:**

POST \- [https://qti.alpha-1edtech.com/api/assessment-items](https://qti.alpha-1edtech.com/api/assessment-items) 

**Description:**

Sending a POST request to this endpoint with the body containing a format: “xml” will create an assessment item. 

```
{
  "format": "xml",
  "metadata": {
    "subject": "English Language Arts",
    "difficulty": "easy",
    "anyMetadata": "test"
  },
  "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<qti-assessment-item \r\n  xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\"\r\n  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"\r\n  xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\r\n  https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd\"\r\n  identifier=\"noun-identification-item-1\"\r\n  title=\"Noun Identification - Mom\" \r\n  time-dependent=\"false\" \r\n  xml:lang=\"en-US\">\r\n  \r\n  <qti-response-declaration identifier=\"RESPONSE\" cardinality=\"single\" base-type=\"identifier\">\r\n    <qti-correct-response>\r\n      <qti-value>mom</qti-value>\r\n    </qti-correct-response>\r\n  </qti-response-declaration>\r\n  \r\n  <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\">\r\n    <qti-default-value>\r\n      <qti-value>0</qti-value>\r\n    </qti-default-value>\r\n  </qti-outcome-declaration>\r\n  \r\n  <qti-item-body>\r\n    <p>Which word in bold is a noun?</p>\r\n    <p>My <strong>mom</strong> usually <strong>seasons</strong> all <strong>her</strong> food with salt.</p>\r\n    \r\n    <qti-choice-interaction response-identifier=\"RESPONSE\" max-choices=\"1\">\r\n      <qti-simple-choice identifier=\"mom\">mom</qti-simple-choice>\r\n      <qti-simple-choice identifier=\"seasons\">seasons</qti-simple-choice>\r\n      <qti-simple-choice identifier=\"her\">her</qti-simple-choice>\r\n    </qti-choice-interaction>\r\n  </qti-item-body>\r\n  \r\n  <qti-response-processing template=\"https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct\"/>\r\n</qti-assessment-item>"
}
```

### Accepted HTML Tags {#accepted-html-tags}

HTML tags accepted on the base of the body. More details can be found directly on the [**1EdTech documentation here**](https://www.imsglobal.org/sites/default/files/spec/qti/v3/bind/index.html#UMLXSDMap_CoreClass_ItemBody)

**Headings & Structure**

```
<h1> <h2> <h3> <h4> <h5> <h6>
<p> <div> <address> <section> <article> <aside> <nav> <header> <footer>
```

**Lists**

```
<ol> <ul> <dl>
```

**Text Blocks & Styling**

```
<pre> <blockquote> <hr>
```

**Media**

```
<audio> <video> <figure>
```

**Tables**

```
<table>
```

**Math & Includes**

```
<math> (from MathML)
<xi:include> (XInclude)
```

✅ All must follow XHTML rules

❌ Avoid \<html\>, \<head\>, and \<body\> tags

## Editing an Assessment Item {#editing-an-assessment-item}

PUT \-  https://qti.alpha-1edtech.com/api/assessment-items/:assessment-item-identifier

**Description:**

Sending a PUT request to this endpoint will update the assessment item associated with that identifier.

### JSON Example {#json-example}

```
{
  {
  "type": "text-entry",
  "identifier": "item-2",
  "title": "Object Identification",
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "standard": "Reading Comprehension",
    "lesson": "Identifying Key Details in Narrative Texts",
    "difficulty": "medium"
  },
  "preInteraction": "<p>After the crocodile caused chaos in the hallway, Anina quickly retreated to her bedroom. She slammed the door shut and grabbed her </p>",
  "interaction": {
    "type": "text-entry",
    "responseIdentifier": "RESPONSE",
    "attributes": {
      "expected-length": 3,
      "pattern-mask": "[A-Za-z]+",
      "placeholder": "Enter object name"
    },
    "questionStructure": {
      "prompt": ""
    }
  },
  "postInteraction": "<p>to push against the door, creating a barricade against the crocodile.</p>",
  "responseDeclarations": [
    {
    "identifier": "RESPONSE",
    "cardinality": "single",
    "baseType": "string",
    "correctResponse": {
      "value": [
        "bed"
      ]
    }
  }
  ],
  "rubrics": [
    {
      "use": "ext:solution",
      "view": "candidate",
      "body": "<p>Step-by-Step Solution:</p><ol><li>Read the complete text, including the preInteraction and postInteraction HTML, to understand the context.</li><li>Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li>Recall that the narrative mentions Anina grabbed her bed to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol>"
    },
    {
      "use": "ext:explanation",
      "view": "scorer",
      "body": "<p>Full Explanation:</p><p>The correct answer is <strong>bed</strong> because the passage describes Anina retreating to her bedroom and using an object to barricade the door against the crocodile. The text explicitly indicates that she grabbed her bed to push against the door, ensuring her safety. This context confirms that the missing word is 'bed'.</p>"
    },
    {
      "use": "ext:criteria",
      "view": "scorer",
      "body": "<p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly identify the missing object as 'bed'.</li><li>The solution should follow a logical, step-by-step reasoning process based on the text.</li><li>The explanation must clearly justify why 'bed' is the appropriate answer by referencing the narrative context.</li><li>Partial credit may be awarded for responses that indicate the correct idea but lack full explanation.</li></ul>"
    }
  ],
  "stimulus": {
   "identifier": "Stimulus1"
 }
}


```

## Deleting an Assessment Item {#deleting-an-assessment-item}

**Endpoint:**

DELETE \-  https://qti.alpha-1edtech.com/api/assessment-items/:assessment-item-identifier

**Description:**

Sending a DELETE request to this endpoint will delete the assessment item associated with that identifier.

The delete will return a status 204 but not a response payload.

## Retrieving an Assessment Item {#retrieving-an-assessment-item}

**Endpoint:**

GET \- https://qti.alpha-1edtech.com/api/assessment-items/:assessment-item-identifier

**Description:**

Sending a GET request to this endpoint will retrieve the assessment item associated with that identifier.

### Sample JSON Result {#sample-json-result}

```
{
  "_id": "67b6ce585cd178fb27212b2b",
  "identifier": "item-2",
  "title": "Object Identification",
  "type": "text-entry",
  "qtiVersion": "3.0",
  "timeDependent": false,
  "adaptive": false,
  "responseDeclarations": [
    {
      "correctResponse": {
        "value": [
          "bed"
        ]
      },
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "string",
      "_id": "67b6d46d5cd178fb27212b3b"
    }
  ],
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "standard": "Reading Comprehension",
    "lesson": "Identifying Key Details in Narrative Texts",
    "difficulty": "medium"
  },
  "rawXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-item xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"item-2\" title=\"Object Identification\" adaptive=\"false\" time-dependent=\"false\">\n  <qti-response-declaration identifier=\"RESPONSE\" cardinality=\"single\" base-type=\"string\">\n    <qti-correct-response>\n      <qti-value>bed</qti-value>\n    </qti-correct-response>\n  </qti-response-declaration>\n  <qti-assessment-stimulus-ref identifier=\"Stimulus1\" href=\"stimuli/Stimulus1.xml\" title=\"An Unbelievable Night\"/>\n  <qti-item-body>\n    <div><p>After the crocodile caused chaos in the hallway, Anina quickly retreated to her bedroom. She slammed the door shut and grabbed her </p></div>\n    <div>\n      <p/>\n    </div>\n    <div>\n      <qti-text-entry-interaction response-identifier=\"RESPONSE\" expected-length=\"3\" pattern-mask=\"[A-Za-z]+\" placeholder=\"Enter object name\"/>\n    </div>\n    <div><p>to push against the door, creating a barricade against the crocodile.</p></div>\n    <qti-rubric-block use=\"ext:solution\" view=\"candidate\">\n      <qti-content-body><p>Step-by-Step Solution:</p><ol><li>Read the complete text, including the preInteraction and postInteraction HTML, to understand the context.</li><li>Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li>Recall that the narrative mentions Anina grabbed her bed to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol></qti-content-body>\n    </qti-rubric-block>\n    <qti-rubric-block use=\"ext:explanation\" view=\"scorer\">\n      <qti-content-body><p>Full Explanation:</p><p>The correct answer is <strong>bed</strong> because the passage describes Anina retreating to her bedroom and using an object to barricade the door against the crocodile. The text explicitly indicates that she grabbed her bed to push against the door, ensuring her safety. This context confirms that the missing word is 'bed'.</p></qti-content-body>\n    </qti-rubric-block>\n    <qti-rubric-block use=\"ext:criteria\" view=\"scorer\">\n      <qti-content-body><p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly identify the missing object as 'bed'.</li><li>The solution should follow a logical, step-by-step reasoning process based on the text.</li><li>The explanation must clearly justify why 'bed' is the appropriate answer by referencing the narrative context.</li><li>Partial credit may be awarded for responses that indicate the correct idea but lack full explanation.</li></ul></qti-content-body>\n    </qti-rubric-block>\n  </qti-item-body>\n</qti-assessment-item>",
  "content": {
    "qti-assessment-item": {
      "_attributes": {
        "xmlns": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd",
        "identifier": "item-2",
        "title": "Object Identification",
        "adaptive": "false",
        "time-dependent": "false"
      },
      "qti-response-declaration": [
        {
          "_attributes": {
            "identifier": "RESPONSE",
            "cardinality": "single",
            "base-type": "string"
          },
          "qti-correct-response": {
            "qti-value": [
              "bed"
            ]
          }
        }
      ],
      "qti-assessment-stimulus-ref": {
        "_attributes": {
          "identifier": "Stimulus1",
          "href": "stimuli/Stimulus1.xml",
          "title": "An Unbelievable Night"
        }
      },
      "qti-item-body": {
        "div": [
          {
            "_": "<p>After the crocodile caused chaos in the hallway, Anina quickly retreated to her bedroom. She slammed the door shut and grabbed her </p>"
          },
          {
            "p": ""
          },
          {
            "qti-text-entry-interaction": [
              {
                "_attributes": {
                  "response-identifier": "RESPONSE",
                  "expected-length": 3,
                  "pattern-mask": "[A-Za-z]+",
                  "placeholder": "Enter object name"
                }
              }
            ]
          },
          {
            "_": "<p>to push against the door, creating a barricade against the crocodile.</p>"
          }
        ],
        "qti-rubric-block": [
          {
            "_attributes": {
              "use": "ext:solution",
              "view": "candidate"
            },
            "qti-content-body": {
              "_": "<p>Step-by-Step Solution:</p><ol><li>Read the complete text, including the preInteraction and postInteraction HTML, to understand the context.</li><li>Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li>Recall that the narrative mentions Anina grabbed her bed to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol>"
            }
          },
          {
            "_attributes": {
              "use": "ext:explanation",
              "view": "scorer"
            },
            "qti-content-body": {
              "_": "<p>Full Explanation:</p><p>The correct answer is <strong>bed</strong> because the passage describes Anina retreating to her bedroom and using an object to barricade the door against the crocodile. The text explicitly indicates that she grabbed her bed to push against the door, ensuring her safety. This context confirms that the missing word is 'bed'.</p>"
            }
          },
          {
            "_attributes": {
              "use": "ext:criteria",
              "view": "scorer"
            },
            "qti-content-body": {
              "_": "<p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly identify the missing object as 'bed'.</li><li>The solution should follow a logical, step-by-step reasoning process based on the text.</li><li>The explanation must clearly justify why 'bed' is the appropriate answer by referencing the narrative context.</li><li>Partial credit may be awarded for responses that indicate the correct idea but lack full explanation.</li></ul>"
            }
          }
        ]
      }
    }
  },
  "outcomeDeclarations": [],
  "modalFeedback": [],
  "feedbackInline": [],
  "feedbackBlock": [],
  "createdAt": "2025-02-20T06:40:24.157Z",
  "updatedAt": "2025-02-20T07:06:21.008Z",
  "__v": 0
}
```

### Sample XML Result {#sample-xml-result}

Set the header: `Content-Type: application/xml`

```
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="item-2" title="Object Identification" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>bed</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-assessment-stimulus-ref identifier="Stimulus1" href="stimuli/Stimulus1.xml" title="An Unbelievable Night"/>
  <qti-item-body>
    <div><p>After the crocodile caused chaos in the hallway, Anina quickly retreated to her bedroom. She slammed the door shut and grabbed her </p></div>
    <div>
      <p/>
    </div>
    <div>
      <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3" pattern-mask="[A-Za-z]+" placeholder="Enter object name"/>
    </div>
    <div><p>to push against the door, creating a barricade against the crocodile.</p></div>
    <qti-rubric-block use="ext:solution" view="candidate">
      <qti-content-body><p>Step-by-Step Solution:</p><ol><li>Read the complete text, including the preInteraction and postInteraction HTML, to understand the context.</li><li>Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li>Recall that the narrative mentions Anina grabbed her bed to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol></qti-content-body>
    </qti-rubric-block>
    <qti-rubric-block use="ext:explanation" view="scorer">
      <qti-content-body><p>Full Explanation:</p><p>The correct answer is <strong>bed</strong> because the passage describes Anina retreating to her bedroom and using an object to barricade the door against the crocodile. The text explicitly indicates that she grabbed her bed to push against the door, ensuring her safety. This context confirms that the missing word is 'bed'.</p></qti-content-body>
    </qti-rubric-block>
    <qti-rubric-block use="ext:criteria" view="scorer">
      <qti-content-body><p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly identify the missing object as 'bed'.</li><li>The solution should follow a logical, step-by-step reasoning process based on the text.</li><li>The explanation must clearly justify why 'bed' is the appropriate answer by referencing the narrative context.</li><li>Partial credit may be awarded for responses that indicate the correct idea but lack full explanation.</li></ul></qti-content-body>
    </qti-rubric-block>
  </qti-item-body>
</qti-assessment-item>
```

# Base JSON for Assessment Items {#base-json-for-assessment-items}

This document details the JSON payload structures required for creating different QTI interaction types via the API. Each section outlines the minimal required structure for a specific interaction type, with explanations of the fields and constraints.

---

## Associate Interaction (Assessment Item `type: "associate"`) {#associate-interaction-(assessment-item-type:-"associate")}

This assessment item type uses an `associateInteraction` where users match items from a source list to items in a target list.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "ASSOC_BASE_1",
  "title": "Base Associate Interaction",
  "type": "associate",
  "interaction": {
    "type": "associate",
    "responseIdentifier": "ASSOC_RESP_1",
    "shuffle": false,
    "maxAssociations": 1,
    "questionStructure": {
      "prompt": "Associate items.",
      "sourceChoices": [
        {
          "identifier": "S1",
          "content": "Source A"
        }
      ],
      "targetChoices": [
        {
          "identifier": "T1",
          "content": "Target X"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "ASSOC_RESP_1",
      "cardinality": "multiple",
      "baseType": "directedPair",
      "correctResponse": {
        "value": [["S1", "T1"]]value": [["S1", "T1"]]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"associate"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"associate"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `shuffle`: Although optional in the base QTI spec, API/XML validation effectively requires this field. `false` is a typical default.  
  - `maxAssociations`: Defines the maximum number of pairings the user can make.  
  - `questionStructure`: This object is required to contain the `prompt` and the choice lists for XML generation.  
    - `prompt`: Text displayed to the user. Effectively required by XML validation.  
    - `sourceChoices`: Array of items the user matches *from*. Each needs a unique `identifier` and `content`.  
    - `targetChoices`: Array of items the user matches *to*. Each needs a unique `identifier` and `content`.  
    - Identifiers within `sourceChoices` must be unique amongst themselves.  
    - Identifiers within `targetChoices` must be unique amongst themselves.  
- **`responseDeclarations` Array:**  
  - Contains one or more objects defining how responses are handled. For a single interaction, usually one declaration.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"multiple"` for associate interactions.  
  - `baseType`: Must be `"directedPair"`. Defines the structure of a single response unit. Test data confirmed `"directedPair"` works.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array of pairs, where each pair is an array `[sourceIdentifier, targetIdentifier]`.

---

## Text Entry Interaction (Assessment Item `type: "text-entry"`) {#text-entry-interaction-(assessment-item-type:-"text-entry")}

This assessment item type uses a `textEntryInteraction` where users enter a short text response in a single-line input field. It's often embedded within text or displayed as a standalone input box.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "TEXT_ENTRY_BASE_1",
  "title": "Base Text Entry Interaction",
  "type": "text-entry",
  "interaction": {
    "type": "text-entry",
    "responseIdentifier": "TEXT_ENTRY_RESP_1",
    "attributes": {
      "expected-length": 5,
      "pattern-mask": "[A-Za-z]+"
    },
    "questionStructure": {
      "prompt": "Enter text here."
    }
  },
  "responseDeclarations": [
    {
      "identifier": "TEXT_ENTRY_RESP_1",
      "cardinality": "single",
      "baseType": "string",
      "correctResponse": {
        "value": ["Sample"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"text-entry"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"text-entry"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `attributes`: Contains configuration settings specific to text entry fields:  
    - `expected-length`: Required positive integer defining the visual size of the input field.  
    - `pattern-mask`: Optional regular expression pattern that input must match.  
    - `placeholder`: Optional text displayed in the field before the user enters anything.  
  - `questionStructure`: This object is required for XML generation:  
    - `prompt`: Text displayed to the user explaining what to enter. Required by XML validation.  
- **`responseDeclarations` Array:**  
  - Contains one or more objects defining how responses are handled. For a single interaction, usually one declaration.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"` for text entry interactions.  
  - `baseType`: Must be `"string"` for text entry interactions.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array of strings, typically with one element.

---

## Choice Interaction (Assessment Item `type: "choice"`) {#choice-interaction-(assessment-item-type:-"choice")}

This assessment item type uses a `choiceInteraction` where users select one or more options from a list of choices. It corresponds to multiple-choice or checkbox-style questions.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "CHOICE_BASE_1",
  "title": "Base Choice Interaction",
  "type": "choice",
  "interaction": {
    "type": "choice",
    "responseIdentifier": "CHOICE_RESP_1",
    "shuffle": false,
    "maxChoices": 1,
    "questionStructure": {
      "prompt": "Select the correct option.",
      "choices": [
        {
          "identifier": "A",
          "content": "Option A"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "CHOICE_RESP_1",
      "cardinality": "single",
      "baseType": "identifier",
      "correctResponse": {
        "value": ["A"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"choice"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"choice"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `shuffle`: Indicates whether the options should be presented in random order. API validation requires this field.  
  - `maxChoices`: Maximum number of options the user can select:  
    - `1` for single-select (radio buttons)  
    - `>1` for multi-select (checkboxes)  
    - `0` potentially for unlimited choices  
  - `questionStructure`: This object is required to contain the `prompt` and `choices` array:  
    - `prompt`: The main question text displayed to the user. Required by XML validation.  
    - `choices`: Array of options the user can select from. Each needs a unique `identifier` and `content`.  
- **`responseDeclarations` Array:**  
  - Contains one or more objects defining how responses are handled. For a single interaction, usually one declaration.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`:  
    - Must be `"single"` when `maxChoices` is `1`  
    - Must be `"multiple"` when `maxChoices` is greater than `1`  
  - `baseType`: Must be `"identifier"` for choice interactions.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array of choice identifiers that matches the cardinality constraints.

---

## Extended Text Interaction (Assessment Item `type: "extended-text"`) {#extended-text-interaction-(assessment-item-type:-"extended-text")}

**Minimal JSON Payload Structure:**

```
{
  "identifier": "EXTENDED_TEXT_BASE_CORRECTED",
  "title": "Base Extended Text Interaction",
  "type": "extended-text",
  "interaction": {
    "type": "extended-text",
    "responseIdentifier": "RESPONSE",
    "questionStructure": {
      "prompt": "Explain the concept of photosynthesis."
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "string",
      "correctResponse": {
        "value": [""]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"extended-text"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"extended-text"` (short name). This is required by the API, even though it's also at the top level.  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `questionStructure`: This object is required for XML generation:  
    - `prompt`: The main question text displayed to the user. Required by validation.  
  - `attributes`: Optional object containing configuration for the text area:  
    - `format`: Specifies if the input should be plain text or allow XHTML formatting.  
    - `expected-length`: A hint for the expected number of characters.  
    - `expected-lines`: A hint for the expected number of lines.  
    - `max-strings`: Maximum number of distinct string segments (e.g., paragraphs).  
    - `min-strings`: Minimum number of distinct string segments.  
    - `pattern-mask`: Optional regex pattern the input should match.  
- **`responseDeclarations` Array:**  
  - Contains one or more objects defining how responses are handled. For a single interaction, usually one declaration.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"` for extended text interactions.  
  - `baseType`: Must be `"string"` for extended text interactions.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array containing a single string. For open-ended questions where no specific answer is 'correct' beforehand, test data uses an empty string `[""]`.

---

## Match Interaction (Assessment Item `type: "match"`) {#match-interaction-(assessment-item-type:-"match")}

This assessment item type uses a `matchInteraction` where users pair items from two distinct sets (source and target). It's similar to `associateInteraction` but often visualized differently, like drawing lines between items.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "MATCH_BASE",
  "title": "Base Match Interaction",
  "type": "match",
  "interaction": {
    "type": "match",
    "responseIdentifier": "RESPONSE",
    "maxAssociations": 2,
    "shuffle": false,
    "questionStructure": {
      "prompt": "Match the capitals to their countries.",
      "sourceChoices": [
        {
          "identifier": "PARIS",
          "content": "Paris"
        },
        {
          "identifier": "TOKYO",
          "content": "Tokyo"
        }
      ],
      "targetChoices": [
        {
          "identifier": "FRANCE",
          "content": "France"
        },
        {
          "identifier": "JAPAN",
          "content": "Japan"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "multiple",
      "baseType": "directedPair",
      "correctResponse": {
        "value": [
          ["PARIS", "FRANCE"],
          ["TOKYO", "JAPAN"]
        ]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"match"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"match"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `shuffle`: Indicates whether the source/target choices should be randomized. Required per test data/validation.  
  - `maxAssociations`: Maximum total number of pairings the user can make across all choices. Required positive integer.  
  - `questionStructure`: This object is required to contain the `prompt` and choice sets:  
    - `prompt`: The main question text displayed to the user. Required by validation.  
    - `sourceChoices`: Array of items the user matches *from*. Each requires a unique `identifier` and `content`.  
    - `targetChoices`: Array of items the user matches *to*. Each requires a unique `identifier` and `content`.  
    - Identifiers must be unique within `sourceChoices` and unique within `targetChoices`.  
    - Optional `matchMax` attribute within choices can control one-to-many or many-to-many matching, but defaults usually imply one-to-one limits.  
- **`responseDeclarations` Array:**  
  - Contains one object defining how responses are handled.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"multiple"` for match interactions.  
  - `baseType`: Must be `"directedPair"` for match interactions, signifying an ordered source-target pair.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array of pairs, where each pair is `[sourceIdentifier, targetIdentifier]` referencing valid choice identifiers.

---

## Hotspot Interaction (Assessment Item `type: "hotspot"`) {#hotspot-interaction-(assessment-item-type:-"hotspot")}

This assessment item type uses a `hotspotInteraction` where users select one or more predefined regions (hotspots) on an image or other graphical object.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "HOTSPOT_BASE",
  "title": "Base Hotspot Interaction",
  "type": "hotspot",
  "interaction": {
    "type": "hotspot",
    "responseIdentifier": "RESPONSE",
    "maxChoices": 1,
    "questionStructure": {
      "prompt": "Click on the designated area.",
      "object": {
        "data": "placeholder_image.jpg",
        "type": "image/jpeg",
        "width": 400,
        "height": 300
      },
      "hotspots": [
        {
          "identifier": "HS1",
          "shape": "rect",
          "coords": "100,50,300,250"
        },
        {
          "identifier": "HS2",
          "shape": "circle",
          "coords": "50,50,40"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "multiple",
      "baseType": "identifier",
      "correctResponse": {
        "value": ["HS1"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"hotspot"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"hotspot"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `maxChoices`: Maximum number of hotspots the user can select. Must be 1 or greater.  
  - `questionStructure`: This object is required and contains the core elements:  
    - `prompt`: The main question text displayed to the user. Required.  
    - `object`: Describes the graphical object (typically an image) on which hotspots are defined. Requires `data` (URL), `type` (MIME type), `width`, and `height`.  
    - `hotspots`: An array defining the clickable regions. Each hotspot must have:  
      - `identifier`: A unique ID for the hotspot.  
      - `shape`: The geometric shape (`"rect"`, `"circle"`, or `"poly"`).  
      - `coords`: A string of comma-separated numbers defining the shape's coordinates relative to the object's top-left corner:  
        - `rect`: `x1,y1,x2,y2` (top-left x, top-left y, bottom-right x, bottom-right y)  
        - `circle`: `centerX,centerY,radius`  
        - `poly`: `x1,y1,x2,y2,...,xn,yn` (vertices)  
- **`responseDeclarations` Array:**  
  - Contains one object defining how responses are handled.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"multiple"` for hotspot interactions, even if `maxChoices` is 1\.  
  - `baseType`: Must be `"identifier"` for hotspot interactions.  
  - `correctResponse.value`: Defines the correct answer(s). Must be an array containing the identifiers of the correct hotspot(s). The number of identifiers in this array must not exceed `maxChoices`.

---

## Order Interaction (Assessment Item `type: "order"`) {#order-interaction-(assessment-item-type:-"order")}

This assessment item type uses an `orderInteraction` where users arrange a set of choices into the correct sequence.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "ORDER_BASE",
  "title": "Base Order Interaction",
  "type": "order",
  "interaction": {
    "type": "order",
    "responseIdentifier": "RESPONSE",
    "shuffle": false,
    "questionStructure": {
      "prompt": "Order the steps:",
      "choices": [
        {
          "identifier": "STEP1",
          "content": "Gather ingredients"
        },
        {
          "identifier": "STEP2",
          "content": "Mix ingredients"
        },
        {
          "identifier": "STEP3",
          "content": "Bake"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "ordered",
      "baseType": "identifier",
      "correctResponse": {
        "value": ["STEP1", "STEP2", "STEP3"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"order"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"order"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `shuffle`: Indicates whether the initial order of choices presented should be randomized. Required per test data/validation.  
  - `questionStructure`: This object is required and contains:  
    - `prompt`: The main question text displayed to the user. Required.  
    - `choices`: An array of the items to be ordered. Each choice requires:  
      - `identifier`: A unique ID for the choice.  
      - `content`: The text or content of the choice.  
      - `fixed`: An optional boolean attribute. If `true`, the choice cannot be moved by the user.  
- **`responseDeclarations` Array:**  
  - Contains one object defining how responses are handled.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"ordered"` for order interactions.  
  - `baseType`: Must be `"identifier"` for order interactions.  
  - `correctResponse.value`: Defines the correct answer. Must be an array containing the identifiers of *all* choices in the correct sequence. The length of this array must equal the number of choices.

---

## Inline Choice Interaction (Assessment Item `type: "inline-choice"`) {#inline-choice-interaction-(assessment-item-type:-"inline-choice")}

This assessment item type uses an `inlineChoiceInteraction` which presents a dropdown menu embedded within a block of text (e.g., a sentence with a blank to be filled).

**Minimal JSON Payload Structure:**

```
{
  "identifier": "INLINE_CHOICE_BASE",
  "title": "Base Inline Choice Interaction",
  "type": "inline-choice",
  "interaction": {
    "type": "inline-choice",
    "responseIdentifier": "RESPONSE",
    "shuffle": false,
    "questionStructure": {
      "prompt": "The capital of France is _____.",
      "inlineChoices": [
        {
          "identifier": "PARIS",
          "content": "Paris"
        },
        {
          "identifier": "LONDON",
          "content": "London"
        },
        {
          "identifier": "BERLIN",
          "content": "Berlin"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "identifier",
      "correctResponse": {
        "value": ["PARIS"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"inline-choice"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"inline-choice"` (short name).  
  - `responseIdentifier`: Links this specific interaction instance to its corresponding entry in the `responseDeclarations` array.  
  - `shuffle`: Indicates whether the choices in the dropdown should be randomized. Required per test data/validation.  
  - `questionStructure`: This object is required and contains:  
    - `prompt`: The text block within which the inline choice will be embedded. The API may automatically place the interaction or expect a placeholder.  
    - `inlineChoices`: An array of the options available in the dropdown. Each choice requires:  
      - `identifier`: A unique ID for the choice.  
      - `content`: The text displayed for the choice.  
- **`responseDeclarations` Array:**  
  - Contains one object defining how responses are handled.  
  - `identifier`: Must match the `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"` for inline choice interactions.  
  - `baseType`: Must be `"identifier"` for inline choice interactions.  
  - `correctResponse.value`: Defines the correct answer. Must be an array containing exactly one identifier from the `inlineChoices`.

---

## Select Point Interaction (Assessment Item `type: "select-point"`) {#select-point-interaction-(assessment-item-type:-"select-point")}

This assessment item type uses a `selectPointInteraction` where users click on one or more specific points on a displayed graphical object (typically an image).

**Minimal JSON Payload Structure:**

```
{
  "identifier": "SELECT_POINT_BASE",
  "title": "Base Select Point Interaction",
  "type": "select-point",
  "interaction": {
    "type": "select-point",
    "responseIdentifier": "RESPONSE",
    "maxChoices": 1,
    "questionStructure": {
      "prompt": "Click on the specific location.",
      "object": {
        "data": "map_image.png",
        "type": "image/png",
        "width": 500,
        "height": 400
      }
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "point",
      "correctResponse": {
        "value": ["250 200"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"select-point"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"select-point"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `maxChoices`: Maximum number of points the user can select. Required, must be 1 or greater.  
  - `minChoices`: Optional minimum number of points the user must select. Defaults to 0\. Must be less than or equal to `maxChoices`.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The question text. Required.  
    - `object`: Describes the graphical object (image) where points are selected. Requires `data`, `type`, `width`, and `height`.  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"` if `maxChoices` is 1, otherwise must be `"multiple"`.  
  - `baseType`: Must be `"point"`.  
  - `correctResponse.value`: Required array defining the correct point(s). Each element must be a string containing space-separated x and y coordinates (`"x y"`) which are valid numbers within the object's bounds (0 \<= x \<= width, 0 \<= y \<= height).

---

## Slider Interaction (Assessment Item `type: "slider"`) {#slider-interaction-(assessment-item-type:-"slider")}

This assessment item type uses a `sliderInteraction` where users select a numerical value by moving a handle along a track (slider).

**Minimal JSON Payload Structure:**

```
{
  "identifier": "SLIDER_BASE",
  "title": "Base Slider Interaction",
  "type": "slider",
  "interaction": {
    "type": "slider",
    "responseIdentifier": "RESPONSE",
    "lower-bound": 0,
    "upper-bound": 10,
    "step": 1,
    "questionStructure": {
      "prompt": "Select a value between 0 and 10."
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "float",
      "correctResponse": {
        "value": [7.0]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"slider"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"slider"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `lower-bound`: The minimum numerical value of the slider. Required.  
  - `upper-bound`: The maximum numerical value of the slider. Required, must be greater than `lower-bound`.  
  - `step`: Optional positive number. If specified, the slider handle will snap to values that are multiples of `step` away from the `lower-bound`. Must not be greater than the range (`upper-bound` \- `lower-bound`).  
  - `questionStructure`: Required object containing:  
    - `prompt`: The question text. Required.  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"`.  
  - `baseType`: Must be `"float"`.  
  - `correctResponse.value`: Required array containing a single number (can be string) representing the correct slider value. This value must be between `lower-bound` and `upper-bound` (inclusive) and must align with a `step` increment if `step` is defined.

---

## Upload Interaction (Assessment Item `type: "upload"`) {#upload-interaction-(assessment-item-type:-"upload")}

This assessment item type uses an `uploadInteraction` where users upload one or more files as their response.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "UPLOAD_BASE",
  "title": "Base Upload Interaction",
  "type": "upload",
  "interaction": {
    "type": "upload",
    "responseIdentifier": "RESPONSE",
    "questionStructure": {
      "prompt": "Upload your assignment document.",
      "allowedTypes": [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "string",
      "correctResponse": {
        "value": [""]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"upload"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"upload"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The question text. Required.  
    - `allowedTypes`: Required array of strings specifying the allowed MIME types for upload (e.g., `"image/png"`, `"application/pdf"`).  
    - `maxSize`: Optional positive number defining the maximum file size allowed in bytes.  
    - `maxFiles`: Optional positive integer defining the maximum number of files that can be uploaded (typically 1).  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"`.  
  - `baseType`: Must be `"string"`. The response value stored is likely the filename or a reference, not the file content itself.  
  - `correctResponse.value`: Required. Must be an array containing a single empty string: `[""]`. This indicates that correctness is typically judged externally, not by comparing the uploaded file to a predefined value.

---

## Media Interaction (Assessment Item `type: "media"`) {#media-interaction-(assessment-item-type:-"media")}

This assessment item type uses a `mediaInteraction` to present audio or video content to the user. The interaction might involve controls for play/pause, and the response often relates to playback status or events, rather than a specific answer.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "MEDIA_BASE_CORRECTED",
  "title": "Base Media Interaction",
  "type": "media",
  "interaction": {
    "type": "media",
    "responseIdentifier": "RESPONSE",
    "autostart": false,
    "minPlays": 0,
    "questionStructure": {
      "prompt": "Watch the following video.",
      "object": {
        "data": "instructional_video.mp4",
        "type": "video/mp4",
        "width": 640,
        "height": 480
      }
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "string",
      "correctResponse": {
        "value": [""]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"media"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"media"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `autostart`: Boolean indicating if playback should begin automatically. Although optional in QTI spec, it was required by the API in testing.  
  - `minPlays`: Minimum number of times the media must be played. Although optional in QTI spec, it was required by the API in testing (\>= 0).  
  - `maxPlays`: Optional maximum number of times the media can be played.  
  - `loop`: Optional boolean indicating if playback should loop.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The instructions or context for the media. Required.  
    - `object`: Describes the media file. Requires `data` (URL) and `type` (MIME type \- validated types: `video/mp4`, `audio/mp3`, `audio/mpeg`). `width` and `height` are optional but recommended for video.  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"`.  
  - `baseType`: Must be `"string"`. The response captured likely represents playback events or status.  
  - `correctResponse.value`: Required. Based on patterns from other non-scored interactions (like Upload) and lack of validation specifics, this should likely be `[""]`. Correctness is typically determined by other factors or interactions.

---

## Drawing Interaction (Assessment Item `type: "drawing"`) {#drawing-interaction-(assessment-item-type:-"drawing")}

This assessment item type uses a `drawingInteraction` which provides the user with a canvas and optionally drawing tools to create a graphical response, potentially over a background image.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "DRAWING_BASE",
  "title": "Base Drawing Interaction",
  "type": "drawing",
  "interaction": {
    "type": "drawing",
    "responseIdentifier": "RESPONSE",
    "questionStructure": {
      "prompt": "Draw the requested diagram.",
      "canvas": {
        "width": 600,
        "height": 400
      },
      "object": {
        "data": "background.png",
        "mediaType": "image/png"
      }
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "single",
      "baseType": "file",
      "correctResponse": {
        "value": [""]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"drawing"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"drawing"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The instructions for the drawing task. Required.  
    - `canvas`: Defines the dimensions (`width`, `height`) of the drawing area. Required.  
    - `object`: Defines an underlying object, typically a background image. Requires `data` (URL) and `mediaType` (MIME type).  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"single"`.  
  - `baseType`: Must be `"file"`. The user's drawing is typically saved as an image file.  
  - `correctResponse.value`: Required. Following the pattern of other externally-scored file-based interactions, this should likely be `[""]`. Correctness depends on external review or potentially complex image analysis defined in outcome processing.

---

## Graphic Associate Interaction (Assessment Item `type: "graphic-associate"`) {#graphic-associate-interaction-(assessment-item-type:-"graphic-associate")}

This assessment item type uses a `graphicAssociateInteraction` where users associate pairs of predefined hotspot regions on a background image, typically by drawing lines between them.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "GRAPHIC_ASSOC_BASE_CORRECTED",
  "title": "Base Graphic Associate Interaction",
  "type": "graphic-associate",
  "interaction": {
    "type": "graphic-associate",
    "responseIdentifier": "RESPONSE",
    "shuffle": false,
    "maxAssociations": 1,
    "questionStructure": {
      "prompt": "Associate the related regions.",
      "object": {
        "data": "diagram_image.png",
        "type": "image/png",
        "width": 500,
        "height": 400
      },
      "associableHotspots": [
        {
          "identifier": "REGION_A",
          "shape": "rect",
          "coords": "50,50,150,150",
          "matchMax": 1
        },
        {
          "identifier": "REGION_B",
          "shape": "rect",
          "coords": "350,250,450,350",
          "matchMax": 1
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "multiple",
      "baseType": "directedPair",
      "correctResponse": {
        "value": ["REGION_A REGION_B"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"graphic-associate"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"graphic-associate"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `shuffle`: Boolean indicating if the hotspot presentation should be randomized. Required by API.  
  - `maxAssociations`: Maximum total number of pairings the user can make across all hotspots. Required positive integer.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The question text. Required.  
    - `object`: Describes the background graphical object (image). Requires `data`, `type`, `width`, and `height`.  
    - `associableHotspots`: An array defining the regions that can be associated. Requires at least two hotspots. Each must have:  
      - `identifier`: A unique ID for the hotspot.  
      - `shape`: The geometric shape (`"rect"`, `"circle"`, or `"poly"`).  
      - `coords`: A string of comma-separated numbers defining the shape's coordinates. Must not include decimals.  
      - `matchMax`: A positive integer indicating the maximum number of associations this hotspot can be part of (as either source or target).  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"multiple"`.  
  - `baseType`: Must be `"directedPair"`.  
  - `correctResponse.value`: Required array defining the correct association(s). Each element must be a string containing two space-separated hotspot identifiers \[`"sourceId targetId"`\] referencing valid `associableHotspots` identifiers.

---

## Graphic Order Interaction (Assessment Item `type: "graphic-order"`) {#graphic-order-interaction-(assessment-item-type:-"graphic-order")}

This assessment item type uses a `graphicOrderInteraction` where users order a set of predefined hotspot regions on a background image, typically by clicking or dragging them into sequence.

**Minimal JSON Payload Structure:**

```
{
  "identifier": "GRAPHIC_ORDER_BASE",
  "title": "Base Graphic Order Interaction",
  "type": "graphic-order",
  "interaction": {
    "type": "graphic-order",
    "responseIdentifier": "RESPONSE",
    "shuffle": false,
    "questionStructure": {
      "prompt": "Order the elements shown on the diagram.",
      "object": {
        "data": "process_diagram.svg",
        "type": "image/svg+xml",
        "width": 600,
        "height": 300
      },
      "orderChoices": [
        {
          "identifier": "STEP_A",
          "shape": "rect",
          "coords": "50,100,150,200"
        },
        {
          "identifier": "STEP_B",
          "shape": "rect",
          "coords": "250,100,350,200"
        },
        {
          "identifier": "STEP_C",
          "shape": "rect",
          "coords": "450,100,550,200"
        }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "RESPONSE",
      "cardinality": "ordered",
      "baseType": "identifier",
      "correctResponse": {
        "value": ["STEP_A", "STEP_B", "STEP_C"]
      }
    }
  ]
}
```

**Field Details & Constraints:**

- **Top Level:**  
  - `identifier`: Unique ID for the assessment item.  
  - `title`: Display title for the item.  
  - `type`: Must be `"graphic-order"` for this item type.  
- **`interaction` Object:**  
  - `type`: Must be `"graphic-order"` (short name).  
  - `responseIdentifier`: Links this interaction instance to its `responseDeclarations` entry.  
  - `shuffle`: Boolean indicating if the initial presentation order of choices should be randomized. Required by API.  
  - `questionStructure`: Required object containing:  
    - `prompt`: The question text. Required.  
    - `object`: Describes the background graphical object (image). Requires `data`, `type`, `width`, and `height`.  
    - `orderChoices`: An array defining the hotspot regions that need to be ordered. Requires at least two choices. Each must have:  
      - `identifier`: A unique ID for the hotspot choice.  
      - `shape`: The geometric shape (`"rect"`, `"circle"`, or `"poly"`).  
      - `coords`: A string of comma-separated numbers defining the shape's coordinates.  
- **`responseDeclarations` Array:**  
  - Contains one object defining response handling.  
  - `identifier`: Must match `interaction.responseIdentifier`.  
  - `cardinality`: Must be `"ordered"`.  
  - `baseType`: Must be `"identifier"`.  
  - `correctResponse.value`: Required array defining the correct sequence. Must contain the identifiers of *all* `orderChoices` in the correct order.

