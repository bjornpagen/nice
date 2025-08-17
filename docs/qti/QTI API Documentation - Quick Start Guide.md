# AE.Studio 1edtech Extended QTI Implementation (Beta)  {#ae.studio-1edtech-extended-qti-implementation-(beta)}

### About the API {#about-the-api}

The AE.Studio 1EdTech Extended QTI Implementation (Beta) builds on the [QTI 3.0 standard](https://www.imsglobal.org/spec/qti/v3p0/impl) by 1EdTech to store digital assessment content in an accessible JSON format. It bridges the gap between traditional QTI XML—which outlines how assessment items, tests, and their components should be structured—and the need for a practical CRUD API, enabling (hopefully) seamless integration across content authoring, storage, and delivery systems. You can also view our [DDL docs](https://docs.google.com/document/d/16x-Hjkpwo6VagzhOxIBD0OfgsnH05lmx2voXW3BCMUA/edit?usp=sharing) for more information. 

###  Connecting to the API {#connecting-to-the-api}

**API Base Url**  
[http://qti.alpha-1edtech.com/](http://qti.alpha-1edtech.com/) 

**Authentication**  
The API is currently public and you don’t need to send any authentication headers.  
Since this is a public API, **use generated UUIDs for your identifiers and save them securely to avoid other people accessing the content you save**. The only way to retrieve Assessment Items, Assessment Tests, and Stimuli is with the correct identifier.

**XML vs JSON**  
Endpoints in this documentation return data in JSON by default. However, some endpoints also support XML. To receive XML responses, set the `Content-Type` header to `application/xml` in your request.

### View Your Generated Questions {#view-your-generated-questions}

After creating a question using the API, you can quickly verify its appearance and functionality by following these steps:

	1\.	**Retrieve the QTI XML**

Send a GET request to the following endpoint, replacing :assessment-item-identifier with your specific question identifier. Make sure to include the header Content-Type: application/xml in your request:

```
GET http://qti.alpha-1edtech.com/api/assessment-items/:assessment-item-identifier
```

	2\.	**Examine the Response**

The response will be the QTI XML for your question. This XML represents the structure and content of your generated question.

	3\.	**Test Your Question**

Copy the returned XML and paste it into the **Item XML** field on the [QTI Sandbox](https://qti.amp-up.io/testrunner/sandbox/). This tool will display your question as it will appear to end users and allow you to answer it to see the corresponding feedback. Click “End Attempt” to simulate a user attempting to answer your question.

This streamlined process enables you to confidently test and visualize your generated questions before deployment.

## Endpoints {#endpoints}

[**AE.Studio 1edtech Extended QTI Implementation (Beta)	1**](#ae.studio-1edtech-extended-qti-implementation-\(beta\))

[About the API	1](#about-the-api)

[Connecting to the API	1](#connecting-to-the-api)

[View Your Generated Questions	1](#view-your-generated-questions)

[Endpoints	3](#endpoints)

[**Creating an Article / Shared Assessment Stimulus	3**](#stimulus)

[**Creating Questions / Assessment Items	6**](#assessment-items)

[**JSON Examples	6**](#heading=h.qo1giwzc3e1c)

[A. Creating a Choice Question Example	6](#a.-creating-a-choice-question-example-\(qti-simple-choice\))

[B. Creating a Text Entry Question Example	10](#b.-creating-a-text-entry-question-example-\(qti-text-entry-interaction\))

[**Creating a Course / Assessment Test	13**](#assessment-test,-test-parts,-sections)

[JSON Creation Example	14](#heading=h.kx2xyhyb8gim)

## Stimulus {#stimulus}

### Creating an Article / Shared Assessment Stimulus

**Endpoint:**

POST \-  [http://qti.alpha-1edtech.com/api/stimuli](http://qti.alpha-1edtech.com/api/stimuli)

**Description:**

This endpoint is used to create a shared stimulus (ex: an article). 

**Example:**

```
{
  "identifier": "Stimulus1",
  "title": "An Unbelievable Night",
  "language": "en",
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "learningObjectiveSet": [
        {
          "source": "CASE",
          "learningObjectiveIds": [
            "6b3304a7-d7cc-11e8-824f-0242ac160002",
            "6b3304a7-d7cc-11e8-824f-0242ac160002"
          ]
        }
      ],
      "lesson": "Analyzing Narrative Elements and Themes"
  },
    "content": "<div class=\"qti-shared-stimulus-wrapper\">\n      <div>\n        <img height=\"210\" width=\"400\"\n             alt=\"Picture of a crocodile.\" src=\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTMlMWeVsVK_lWrxVPJ3wRvyX1nOORaDtQKw&s\"/>\n      </div>\n      <h2 class=\"passage-title\">An Unbelievable Night</h2>\n      <p class=\"author-line\">by Franz Hohler</p>\n      <p><span data-catalog-idref=\"test\">Anina</span> was ten years old,\n        so even half asleep she could find her way from her room to the bathroom.\n        The door to her room was usually open a crack, and the nightlight in the hallway\n        made it light enough to get to the bathroom past the telephone stand.\n      </p>\n      <p>\n        One night, as she passed the telephone stand on her way to the bathroom, Anina\n        heard something that sounded like a quiet hissing. But, because she was half asleep,\n        she didn t really pay any attention to it. Anyway, it came from pretty far away.\n        Not until she was on her way back to her room did she see where it came from.\n        Under the telephone stand there was a large pile of old newspapers and magazines,\n        and this pile now began to move. That was where the noise was coming from.\n        All of a sudden the pile started to fall over - right, left, forwards, backwards -\n        then there were newspapers and magazines all over the floor.\n      </p>\n      <p>\n        Anina could not believe her eyes as she watched a grunting and\n        snorting crocodile come out from under the telephone stand.\n      </p>\n      <p>\n        Anina was frozen to the spot. Her eyes wide as saucers,\n        she watched the crocodile crawl completely out of the newspapers and slowly look\n        around the apartment. It seemed to have just come out of the water because its\n        whole body was dripping wet. Wherever the crocodile stepped, the carpet under it\n        became drenched.\n      </p>\n      <p>\n        The crocodile moved its head back and forth letting out a loud hissing sound.\n        Anina swallowed hard, looking at the crocodile s snout with its terribly long\n        row of teeth. It swung its tail slowly back and forth. Anina had read about that\n        in 'Animal Magazine' - how the crocodile whips the water with its tail to chase\n        away or attack its enemies.\n      </p>\n      <p>\n        Her gaze fell on the last issue of 'Animal Magazine', which had fallen from\n        the pile and was lying at her feet. She got another shock. The cover of the\n        magazine used to have a picture of a big crocodile on a river bank. The river\n        bank was now empty!\n      </p>\n      <p>\n        Anina bent down and picked up the magazine. At that moment the crocodile\n        whipped his tail so hard that he cracked the big vase of sunflowers on the floor\n        and the sunflowers scattered everywhere. With a quick jump Anina was in her\n        bedroom. She slammed the door shut, grabbed her bed and pushed it up against the\n        door. She had built a barricade that would keep her safe from the crocodile.\n        Relieved, she let her breath out. But then she hesitated. What if the beast was\n        simply hungry? Maybe to make the crocodile go away you had to give it something to eat?\n      </p>\n      <p>\n        Anina looked again at the animal magazine. If the crocodile could crawl out\n        of a picture then perhaps other animals could too. Anina hastily flipped through\n        the magazine and stopped at a swarm of flamingos in a jungle swamp. Just right,\n        she thought. They look like a birthday cake for crocodiles.\n      </p>\n      <p>\n        Suddenly there was a loud crack and the tip of the crocodile s tail pushed\n        through the splintered door. Quickly, Anina held the picture of the flamingos up\n        to the hole in the door and called as loud as she could, 'Get out of the swamp!\n        Shoo! Shoo!' Then she threw the magazine through the hole into the hallway,\n        clapped her hands and yelled and screamed.\n      </p>\n      <p>\n        She could hardly believe what happened next. The entire hallway was suddenly\n        filled with screeching flamingos wildly flapping their wings and running around\n        all over the place on their long, skinny legs. Anina saw one bird with a sunflower\n        in its beak and another grabbing her mother's hat from its hook. She also saw a\n        flamingo disappear into the crocodile's mouth. With two quick bites he swallowed\n        the flamingo and quickly followed it with another, the one with the sunflower\n        in its beak.\n      </p>\n\n      <p>\n        After two portions of flamingo the crocodile seemed to have had enough and\n        lay down contentedly in the middle of the hallway. When he had closed his eyes\n        and no longer moved, Anina quietly opened her door and slipped through it into\n        the hallway. She placed the empty magazine cover in front of the crocodile s nose.\n        'Please', she whispered, 'please go back home'. She crept back into the bedroom\n        and looked through the hole in the door. She saw the crocodile back on the cover\n        of the magazine.\n      </p>\n      <p>\n        She now went cautiously into the living room where the flamingos were crowded\n        around the sofa and standing on the television. Anina opened the magazine to the\n        page with the empty picture. 'Thank you', she said, 'thank you very much. You\n        may now go back to your swamp'.\n      </p>\n      <p>\n        In the morning, it was very difficult for her to explain the giant wet spot\n        on the floor and the broken door to her parents. They weren't convinced about\n        the crocodile even though her mother's hat was nowhere to be found.\n      </p>\n      <p class=\"passage-credit\">\n        Adapted from Eine Wilde Nacht in Der Große Zwerg und Andere Geschichten by Franz Hohler.\n        Published 2003 by Deutscher Taschenbuch Verlag, Munchen, Germany. Illustrations by Thomas Hoffmann.\n      </p>\n    </div>",
  "catalogInfo": [
    {
      "id": "test",
      "support": "linguistic-guidance",
      "content": "Anina is the name of a girl."
    }
  ]
}
```

**Parameter Details:**

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | String | Yes | A unique value representing the stimulus. Generate and store a UUID to reference this resource later (for editing, retrieval, updating, or deletion). |
| title | String | Yes | A human-readable label for the stimulus. Use a clear, descriptive title to identify the article or stimulus content. |
| language | String (ISO code) | Optional | Specifies the language of the stimulus (e.g., "en" for English). |
| metadata | Object | Optional | A generic key-value object to attach additional contextual information (e.g., subject, grade, standard, lesson). Note that metadata is only included in JSON responses and omitted in XML responses to maintain QTI compliance. If the question has difficulty, add in the metadata with the values being “easy”, “medium”, or “hard”. |
| content | String (HTML) | Yes | Contains the formatted stimulus content in HTML, including images, styling, or embedded content necessary for correct display in client applications. |
| catalogInfo | Array of Objects | Optional | Provides supplemental catalog information (such as linguistic guidance). Each object may include fields like \`id\`, \`support\`, and \`content\` to offer additional context for the stimulus. |

For Editing, Deleting and Searching Stimuli, please see the [more advanced documentation](?tab=t.1q5qlscuutnj).

## Assessment Items {#assessment-items}

### Creating Questions / Assessment Items

**Endpoint:**

POST \- [http://qti.alpha-1edtech.com/api/assessment-items](http://qti.alpha-1edtech.com/api/assessment-items) 

**Description:**

Sending a POST request to this endpoint will create an assessment item. 

**Examples**

#### A. Creating a Choice Question Example (qti-simple-choice)  {#a.-creating-a-choice-question-example-(qti-simple-choice)}

**Purpose:** Present multiple choices (single or multiple correct answers).

```
{
  "type": "choice",
  "identifier": "worked-example-item-1",
  "title": "An Unbelievable Night Event",
  "metadata": {
    "subject": "English Language Arts",
    "grade": "5",
    "learningObjectiveSet": [
        {
          "source": "CASE",
          "learningObjectiveIds": [
            "6b3304a7-d7cc-11e8-824f-0242ac160002",
            "6b3304a7-d7cc-11e8-824f-0242ac160002"
          ]
        }
     ],
    "lesson": "Identifying Key Events and Details",
    "difficulty": "medium"
  },
  "preInteraction": "<div style=\"text-align:center; padding: 15px; background-color: #f0f0f0; border-radius: 8px; margin-bottom: 15px;\"><p style=\"font-size: 1.2em; color: #333;\">Just right, she thought. They look like a birthday cake for crocodiles.</p><img src=\"https://axelscheffler.com/media/pages/books-with-julia-donaldson/the-ugly-five/c08b4e6ee4-1642776469/title-page_low-res-fpo-960x.png\" alt=\"Flamingos\" style=\"max-width:100%; height:auto; border-radius: 4px;\" /></div>",
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
          "content": "The crocodile immediately left the apartment.",
          "feedbackInline": "<span style=\"color: #D9534F;\">Incorrect: The crocodile did not leave the apartment.</span>",
          "feedbackOutcomeIdentifier": "FEEDBACK-INLINE"
        },
        {
          "identifier": "B",
          "content": "The hallway filled with screeching, flapping flamingos.",
          "feedbackInline": "<span style=\"color: #2E8B57;\">Correct: The hallway filled with screeching, flapping flamingos.</span>",
          "feedbackOutcomeIdentifier": "FEEDBACK-INLINE"
        },
        {
          "identifier": "C",
          "content": "The telephone stand toppled over.",
          "feedbackInline": "<span style=\"color: #D9534F;\">Incorrect: The telephone stand did not topple over.</span>",
          "feedbackOutcomeIdentifier": "FEEDBACK-INLINE"
        },
        {
          "identifier": "D",
          "content": "Her mother's hat reappeared on the hook.",
          "feedbackInline": "<span style=\"color: #D9534F;\">Incorrect:  Her mother's hat did not reappear on the hook.</span>",
          "feedbackOutcomeIdentifier": "FEEDBACK-INLINE"
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
  "outcomeDeclarations": [
    {
      "identifier": "FEEDBACK",
      "cardinality": "single",
      "baseType": "identifier"
    },
    {
      "identifier": "FEEDBACK-INLINE",
      "cardinality": "single",
      "baseType": "identifier"
    }
  ],
  "responseProcessing": {
    "templateType": "match_correct",
    "responseDeclarationIdentifier": "RESPONSE",
    "outcomeIdentifier": "FEEDBACK",
    "correctResponseIdentifier": "CORRECT",
    "incorrectResponseIdentifier": "INCORRECT",
    "inlineFeedback": {
      "outcomeIdentifier": "FEEDBACK-INLINE",
      "variableIdentifier": "RESPONSE"
    }
  },
  "feedbackBlock": [
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "CORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #2E8B57; padding:10px; background:#fff; margin-bottom:15px;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Answer Summary</h2><p><span style=\"color:#2E8B57; font-weight:bold;\">Excellent work!</span> Your answer is correct—the hallway filled with screeching, flapping flamingos.</p></div>"
    },
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "CORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #2E8B57; padding:10px; background:#fff;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Step-by-Step Explanation</h2><ol style=\"margin:0; padding-left:20px;\"><li style=\"margin-bottom:8px;\">Read the complete text to understand the context.</li><li style=\"margin-bottom:8px;\">Identify that the narrative describes a sudden, extraordinary event after the magazine's flamingo picture was used.</li><li style=\"margin-bottom:8px;\">Recognize that the hallway was filled with screeching, flapping flamingos.</li><li>Conclude that the unexpected event is the appearance of these flamingos.</li></ol></div>"
    },
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "INCORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #D9534F; padding:10px; background:#fff; margin-bottom:15px;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Answer Summary</h2><p><span style=\"color:#D9534F; font-weight:bold;\">Not quite.</span> Your answer isn’t correct. Review the passage: it explains that after the magazine's flamingo picture was used, the hallway was filled with screeching, flapping flamingos.</p></div>"
    },
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "INCORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #d11919; padding:10px; background:#fff;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Step-by-Step Explanation</h2><ol style=\"margin:0; padding-left:20px;\"><li style=\"margin-bottom:8px;\">Read the complete text to understand the context.</li><li style=\"margin-bottom:8px;\">Identify that the passage describes a sudden event after the magazine's flamingo picture was used.</li><li style=\"margin-bottom:8px;\">Notice that the hallway was filled with screeching, flapping flamingos.</li><li>Conclude that the correct answer is that the hallway was filled with these flamingos.</li></ol></div>"
    }
  ],
  "rubrics": [
    {
      "use": "ext:criteria",
      "view": "scorer",
      "body": "<p>Grading Criteria for Text Box Answers:</p><ul><li>The response must correctly state that the hallway was filled with screeching, flapping flamingos.</li><li>The solution should clearly reflect the sequence of events from the passage.</li><li>The explanation must justify why this event is considered unexpected, using details from the narrative.</li><li>Partial credit may be awarded for answers that mention the arrival of flamingos or other animal activity, even if not fully detailed.</li></ul>"
    }
  ],
  "stimulus": {
   "identifier": "Stimulus1"
 }
}

```

#### B. Creating a Text Entry Question Example (qti-text-entry-interaction) {#b.-creating-a-text-entry-question-example-(qti-text-entry-interaction)}

**Purpose:** Simple text input, often used for short answers.

```
{
  "type": "text-entry",
  "identifier": "worked-example-item-2",
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
  "outcomeDeclarations": [
    {
    "identifier": "FEEDBACK",
    "cardinality": "single",
    "baseType": "identifier"
  }
  ],
  "responseProcessing": {
    "templateType": "match_correct",
    "responseDeclarationIdentifier": "RESPONSE", 
    "outcomeIdentifier": "FEEDBACK",
    "correctResponseIdentifier": "CORRECT",
    "incorrectResponseIdentifier": "INCORRECT"
  },
  "feedbackBlock": [
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "CORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #2E8B57; padding:10px; background:#fff; margin-bottom:15px;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Answer Summary</h2><p><span style=\"color:#2E8B57; font-weight:bold;\">Excellent work!</span> Your answer is correct—the missing word is <strong>bed</strong>.</p></div>"
    },
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "CORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #2E8B57; padding:10px; background:#fff;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Step-by-Step Explanation</h2><ol style=\"margin:0; padding-left:20px;\"><li style=\"margin-bottom:8px;\">Read the complete text to understand the context.</li><li style=\"margin-bottom:8px;\">Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li style=\"margin-bottom:8px;\">Recall that the narrative mentions Anina grabbed her <strong>bed</strong> to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol></div>"
    },
     {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "INCORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #D9534F; padding:10px; background:#fff; margin-bottom:15px;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Answer Summary</h2><p><span style=\"color:#D9534F; font-weight:bold;\">Not quite.</span> Your answer isn’t correct. Review the passage: it explains that Anina rushed to her bedroom and pushed her bed against the door to keep the crocodile out. This shows that the correct missing word is <strong>bed</strong>.</p></div>"
    },
    {
      "outcomeIdentifier": "FEEDBACK",
      "identifier": "INCORRECT",
      "showHide": "show",
      "content": "<div style=\"border-left:5px solid #d11919; padding:10px; background:#fff;\"><h2 style=\"margin:0 0 10px 0; font-size:1.3em; color:#333;\">Step-by-Step Explanation</h2><ol style=\"margin:0; padding-left:20px;\"><li style=\"margin-bottom:8px;\">Read the complete text to understand the context.</li><li style=\"margin-bottom:8px;\">Identify that the sentence is missing a word that describes the object Anina grabbed.</li><li style=\"margin-bottom:8px;\">Recall that the narrative mentions Anina grabbed her <strong>bed</strong> to use as a barricade.</li><li>Conclude that the correct answer is <strong>bed</strong>.</li></ol></div>"
    }
  ],
  "rubrics": [
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

**Parameter Details:**

## 

| *Field* | *Type* | *Required* | *Description* |
| :---- | :---- | :---- | :---- |
| type | String | Required | Specifies the assessment item type (e.g., "choice", "text-entry"). Determines which validators and interaction details are applied (including 1EdTech validations). |
| identifier | String | Required | A unique identifier for the assessment item (e.g., a UUID). Use this to reference the item for editing, retrieval, updating, or deletion. |
| title | String | Required | A human-readable title that clearly identifies the purpose or content of the assessment item. |
| metadata | Object | Optional | A generic key-value object to attach additional contextual information (e.g., subject, grade, standard, lesson). Note that metadata is only included in JSON responses and omitted in XML responses to maintain QTI compliance.If the question has difficulty, add in the metadata with the values being “easy”, “medium”, or “hard”. |
| preInteraction | String (HTML) | Optional | HTML content displayed before the interactive element, providing introductory context or instructions. Can be used to display images or diagrams. |
| interaction | Object | Required | Contains details for the interactive component.  |
| └─ interaction.type | String | Required | Specifies the interaction type (e.g., “choice” or “text-entry”). |
| └─ interaction.responseIdentifier | String | Required | Identifier linking the interaction to its response declaration. |
| └─ interaction.questionStructure | Object | Required | Must include prompt and, for choice questions, choices. |
| └─ interaction.questionStructure.prompt | String | Optional | The prompt or main question text.  *Tip: Some of the questions in the CCC database have html elements in the question. It is recommended that you strip these before trying to save this as a prompt.* |
| └─ interaction.questionStructure.choices | Array of Objects | Required for choice questions | The choices that are provided for a multiple choice question. |
| └─ interaction.questionStructure.choices.identifier | String | Required for choice questions | A unique ID for the choice. |
| └─ interaction.questionStructure.choices.content | String | Required for choice questions | The text displayed as the option. |
| └─ interaction.questionStructure.choices.feedbackInline | String (HTML) | Optional | qti-feedback-inlineThe feedback to display after the choice is selected. |
| └─ interaction.questionStructure.choices.feedbackOutcomeIdentifier | String | Required if using feedbackInline | Links inline feedback with appropriate outcome declaration. |
| └─ interaction.attributes | Object | Optional | Contains additional attributes for text input.  |
| └─ interaction.attributes.expected-length | Number | Optional | Expected length of the response |
| └─ interaction.attributes.pattern-mask | String | Optional | Specify constraints on how the response should be formatted or structured |
| └─ interaction.attributes.placeholder | String | Optional | Placeholder text for the response field |
| └─ interaction.shuffle | Boolean | Optional | Indicates whether the order of choices should be randomized. |
| └─ interaction.maxChoices | Number | Optional | Maximum number of choices that can be selected. |
| postInteraction | String (HTML) | Optional | HTML content displayed after the interactive element, providing additional context or instructions. |
| responseDeclarations | Array of Objects | Required | qti-response-declarationDefines the correct response or responses. It tells the response processing engine what a “correct” response is.  |
| └─ responseDeclarations.identifier | String | Required | A unique identifier. |
| └─ responseDeclarations.cardinality | String | Required | How many responses a candidate is allowed (or expected) to provide for that particular item (e.g. “single” or “multiple”). |
| └─ responseDeclarations.baseType | String | Required | Specifies the data type of the expected response, such as “identifier” (ex: choices in a multiple choice question), “string”, “integer” or “float”.  |
| └─ responseDeclarations.correctResponse | Object | Required | Object that contains the correct value |
| └─ responseDeclarations.correctResponse.value | Array of strings | Required | List of correct values |
| outcomeDeclarations | Array of Objects | Required | Specifies outcome parameters for feedback and scoring. Outcome declarations specify what outputs (like a score or feedback outcome) should be produced after the candidate’s response is evaluated using the response declaration and the response processing rules. |
| └─ outcomeDeclarations.identifier | String | Required | A unique identifier. |
| └─ outcomeDeclarations.cardinality | String | Required | How many values are expected for the outcome (e.g. “single” or “multiple”). |
| └─ outcomeDeclarations.baseType | String | Required | Specifies the data type of the expected outcome, such as “identifier” (ex: a feedback block), “string”, “integer” or “float”.  |
| responseProcessing | Object | Required | Defines the logic and rules for evaluating a test-taker’s response against the correct answer. |
| └─ responseProcessing.templateType | String | Required | The processing template used (e.g., "match\_correct") to evaluate the response. |
| └─ responseProcessing.responseDeclarationIdentifier | String | Required | Links the response processing to the corresponding response declaration. |
| └─ responseProcessing.outcomeIdentifier | String | Required | Specifies the outcome identifier where the processing result (e.g., score or feedback) is stored. |
| └─ responseProcessing.correctResponseIdentifier | String | Required if feedbackBlock used | Identifier used to reference the correct response outcome. |
| └─ responseProcessing.incorrectResponseIdentifier | String | Required if feedbackBlock used | Identifier used to reference the incorrect response outcome. |
| └─ responseProcessing.inlineFeedback | Object | Required if feedbackInline used | Provides details for inline feedback. |
| └─responseProcessing.inlineFeedback.outcomeIdentifier | String | Required if feedbackInline used | Outcome identifier for inline feedback. |
| └─ responseProcessing.inlineFeedback.variableIdentifier | String | Required if feedbackInline used | Specifies the variable within the inline feedback mechanism that corresponds to the candidate’s response.  |
| feedbackBlock | Array of Objects | Optional | qti-feedback-blockUsed to deliver detailed, formatted feedback to the test-taker after their response has been processed.  |
| └─ feedbackBlock.outcomeIdentifier | String | Required if using feedbackBlock | Each feedback block is associated with a particular outcome (via the outcomeIdentifier), ensuring that the appropriate feedback is linked to the evaluated response. |
| └─ feedbackBlock.identifier | String | Required if using feedbackBlock | A unique identifier for the feedback block, used to reference this particular piece of feedback. |
| └─ feedbackBlock.showHide | String | Required if using feedbackBlock | Indicates whether the feedback block should be whether a particular feedback block is displayed to the user immediately after their response is processed. |
| └─ feedbackBlock.content | String | Required if using feedbackBlock | HTML content providing detailed feedback (such as an answer summary or a step-by-step explanation). |
| rubrics | Array of Objects | Optional | qti-rubric-blockProvides grading criteria and detailed explanations. Each rubric object includes properties like use, view, and body (HTML content with grading criteria). |
| └─rubrics.use | String | Required if using Rubrics | Indicates the purpose or context of the rubric (instructions, scoring, navigation, or ext:*custom*).  |
| └─rubrics.view | String | Required if using Rubrics | Specifies the intended audience or view for the rubric (author, proctor, candidate, scorer, testConstructor, tutor). This helps determine who will use or see the rubric. |
| └─rubrics.body | String | Required if using Rubrics | Contains the detailed grading criteria and explanation in HTML format. This is the main content that outlines the scoring rules or steps for evaluation. |
| stimulus | Object | Optional | References a shared stimulus resource used by the assessment item. |
| └─ stimulus.identifier | String | Required if using stimulus | The unique identifier of the shared stimulus that this item references. |

For Editing, Deleting and Searching Assessment Items or adding other question types, please see the [more advanced documentation](?tab=t.5qcd5ifivjsv).

## 

## Assessment Test, Test Parts, Sections {#assessment-test,-test-parts,-sections}

### Creating a Course / Assessment Test with Test Parts and Sections

**Endpoint:**

POST \- [http://qti.alpha-1edtech.com/api/assessment-tests](http://qti.alpha-1edtech.com/api/assessment-tests)

**Description:**

Sending a POST request to this endpoint will create an assessment test. 1EdTech validations are verified to guarantee the correct test generation. You can create a test’s testParts (lessons) and sections at the same time as creating your test. If you need to add additional test parts or sections or modify test parts, sections, and tests, or add additional assessmentItems to your sections, please see the [more comprehensive documentation](?tab=t.9imvmfsln21c).

**Example**

```
{
    "identifier": "course-1",
    "title": "Example Course",
    "qti-test-part": [ // array with your lessons, in the order you expect them to be displayed
        {
            "identifier": "lesson-1",
            "navigationMode": "nonlinear",
            "submissionMode": "simultaneous",
            "qti-assessment-section": [
                {
                    "identifier": "article-section",
                    "title": "Article Section",
                    "visible": true,
                    "required": true,
                    "fixed": false,
                    "sequence": 1,
                    "qti-assessment-item-ref": [ // these are the references to the questions you created before
                        {
                            "identifier": "worked-example-item-1",
                            "href": "worked-example-item-1.xml" // no additional logic is done with this value
                        },
                        {
                            "identifier": "worked-example-item-2",
                            "href": "worked-example-item-2.xml" // no additional logic is done with this value
                        }
                    ]
                },
                {
                    "identifier": "question-bank",
                    "title": "Question Bank",
                    "visible": true,
                    "required": false,
                    "fixed": false,
                    "sequence": 2,
                    "qti-assessment-item-ref": [ // these are the references to the questions you created before
                        {
                            "identifier": "question-1",
                            "href": "question-1.xml" // no additional logic is done with this value
                        },
                        {
                            "identifier": "question-2",
                            "href": "question-2.xml" // no additional logic is done with this value
                        }
                    ]
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

**Parameter Details**

***Assessment Test Fields***

| *Field* | *Type* | *Required* | *Description* |
| :---- | :---- | :---- | :---- |
| identifier | String | Required | A unique identifier for the assessment test (e.g., a UUID). Use this to reference the item for editing, retrieval, updating, or deletion. |
| title | String | Required | Title of the course/assessment test. |
| qti-test-part | Array of Objects | Required | An array representing lessons (test parts) included in the test. A test must include at least one test part. |
| qti-outcome-declaration | Array of Objects | Required | Defines outcome declarations for the test (e.g., SCORE).  |
| └─ qti-outcome-declaration.identifier | String | Required | A unique identifier |
| └─ qti-outcome-declaration.cardinality | String | Required | How many values are expected for the outcome (e.g. “single” or “multiple”). |
| └─ qti-outcome-declaration.baseType | String | Required | Specifies the data type of the expected outcome, such as “identifier” (ex: a feedback block), “string”, “integer” or “float”.  |

***Test Part Fields (qti-test-part)***

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| **identifier** | String | Yes | Unique identifier (UUID) for the test part |
| **navigationMode** | String | Yes | Defines how a user navigates this part (e.g., "linear" or "nonlinear"). |
| **submissionMode** | String | Yes | Defines how answers are submitted (e.g., "individual" or "simultaneous"). |
| **qti-assessment-section** | Array of Objects | Yes | Contains sections within the test part (e.g., article section, question bank). A test part must include at least one section. |

***Section Fields (qti-assessment-section)***

| Field | Type | Required | Description |
| :---- | :---- | :---- | :---- |
| identifier | String | Yes | Unique identifier (UUID) for the assessment section. |
| title | String | Yes | Title of the section. |
| visible | Boolean | Yes | Indicates if the section is visible. |
| required | Boolean | Yes | Specifies if the section is mandatory for the assessment.  |
| fixed | Boolean | Yes | Indicates if the section is fixed (i.e., its order cannot be changed). |
| sequence | Number | Yes | Determines the order in which the section appears. |
| qti-assessment-item-ref | Array of Objects | Yes | An array of references to assessment items (questions) associated with this section. A section must include one or more items. |

