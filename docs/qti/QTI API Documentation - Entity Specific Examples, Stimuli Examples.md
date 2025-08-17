# 1edtech QTI API Stimuli Examples

This guide provides examples of how to create, update, delete, and search stimuli using the 1edtech QTI API.

## Summary {#summary}

[**Summary**](#summary)

[**Creating Stimulus**](#creating-stimulus)

[Sample Stimulus Creation](#sample-stimulus-creation)

[**Editing Stimulus**](#editing-stimulus)

[Sample Stimulus Creation](#sample-stimulus-creation-1)

[**Deleting Stimulus**](#deleting-stimulus)

[**Searching Stimulus**](#searching-stimulus)

[Sample Stimulus Search Result](#sample-stimulus-search-result)

## Creating Stimulus {#creating-stimulus}

**Endpoint:**

POST \- [https://qti.alpha-1edtech.com/api/stimuli](https://qti.alpha-1edtech.com/api/stimuli) 

**Description:**

This endpoint is used to create a stimulus. The request body should include details like an identifier, title, language, and the HTML or media content.

**Key Field Clarifications**

*language*  
The language code of the content (e.g., "en" for English).

*content*  
The HTML or media data that presents the actual stimulus.

*catalogInfo*  
An optional array providing additional info or annotations (e.g., definitions of terms).

### Sample Stimulus Creation {#sample-stimulus-creation}

```
{
  "identifier": "Stimulus121",
  "title": "An Unbelievable Night",
  "language": "en",
  "content": "<div><img height=\"210\" width=\"400\" alt=\"Picture of a door opening to a hallway. A person's shadow is cast on the door and hallway.\" src=\"images/exemplarSection01_title.png\"/></div><h2 class=\"passage-title\">An Unbelievable Night</h2><p class=\"author-line\">by Franz Hohler</p><p><span data-catalog-idref=\"c1234\">Anina</span> was ten years old, so even half asleep she could find her way from her room to the bathroom. The door to her room was usually open a crack, and the nightlight in the hallway made it light enough to get to the bathroom past the telephone stand.</p>",
  "catalogInfo": [
    {
      "id": "c1234",
      "support": "linguistic-guidance",
      "content": "Anina is the name of a girl."
    }
  ]
}
```

#### Accepted HTML Tags

HTML tags accepted on the base of the content. More details can be found directly on the [**1EdTech documentation here**](https://www.imsglobal.org/sites/default/files/spec/qti/v3/bind/index.html#UMLXSDMap_CoreClass_ItemBody)

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

## Editing Stimulus {#editing-stimulus}

**Endpoint:**

PUT \-  [https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier](https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier) 

**Description:**

This endpoint is used to edit a stimulus. 

### Sample Stimulus Creation {#sample-stimulus-creation-1}

### 

Editing the title to a new one i pass the same attributes as the creation but changing the title

```
{
  "identifier": "Stimulus121",
  "title": "Amazing Stimulus",
  "language": "en",
  "content": "<div><img height=\"210\" width=\"400\" alt=\"Picture of a door opening to a hallway. A person's shadow is cast on the door and hallway.\" src=\"images/exemplarSection01_title.png\"/></div><h2 class=\"passage-title\">An Unbelievable Night</h2><p class=\"author-line\">by Franz Hohler</p><p><span data-catalog-idref=\"c1234\">Anina</span> was ten years old, so even half asleep she could find her way from her room to the bathroom. The door to her room was usually open a crack, and the nightlight in the hallway made it light enough to get to the bathroom past the telephone stand.</p>",
  "catalogInfo": [
    {
      "id": "c1234",
      "support": "linguistic-guidance",
      "content": "Anina is the name of a girl."
    }
  ]
}
```

## Deleting Stimulus {#deleting-stimulus}

**Endpoint:**

DELETE \-  [https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier](https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier) 

**Description:**

This endpoint is used to delete a stimulus. 

The delete will return a status 204 but not a response payload.

## Searching Stimulus {#searching-stimulus}

**Endpoint:**

GET \- [https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier](https://qti.alpha-1edtech.com/api/stimuli/:assessment-stimulus-identifier) 

**Description:**

This endpoint is used to search for a stimulus. 

### Sample Stimulus Search Result {#sample-stimulus-search-result}

```
{
  "_id": "67b54e7a03d8ab2b869eb56f",
  "identifier": "Stimulus12",
  "title": "An Unbelievable Night",
  "language": "en",
  "content": {
    "qti-assessment-stimulus": {
      "_attributes": {
        "xmlns": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0",
        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "xsi:schemaLocation": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_stimulusv3p0p1_v1p0.xsd",
        "identifier": "Stimulus12",
        "xml:lang": "en",
        "title": "An Unbelievable Night"
      },
      "qti-stimulus-body": {
        "div": {
          "img": {
            "_attributes": {
              "height": "210",
              "width": "400",
              "alt": "Picture of a door opening to a hallway. A person's shadow is cast on the door and hallway.",
              "src": "images/exemplarSection01_title.png"
            }
          }
        },
        "h2": {
          "_": "An Unbelievable Night",
          "_attributes": {
            "class": "passage-title"
          }
        },
        "p": [
          {
            "_": "by Franz Hohler",
            "_attributes": {
              "class": "author-line"
            }
          },
          {
            "_": "was ten years old, so even half asleep she could find her way from her room to the bathroom. The door to her room was usually open a crack, and the nightlight in the hallway made it light enough to get to the bathroom past the telephone stand.",
            "span": {
              "_": "Anina",
              "_attributes": {
                "data-catalog-idref": "c1234"
              }
            }
          }
        ]
      },
      "qti-catalog-info": {
        "qti-catalog": {
          "_attributes": {
            "id": "c1234"
          },
          "qti-card": {
            "_attributes": {
              "support": "linguistic-guidance"
            },
            "qti-html-content": "Anina is the name of a girl."
          }
        }
      }
    }
  },
  "catalogInfo": [
    {
      "id": "c1234",
      "support": "linguistic-guidance",
      "content": "Anina is the name of a girl.",
      "_id": "67b54e7a03d8ab2b869eb570"
    }
  ],
  "rawXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-stimulus xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_stimulusv3p0p1_v1p0.xsd\" identifier=\"Stimulus12\" xml:lang=\"en\" title=\"An Unbelievable Night\">\n  <qti-stimulus-body><div><img height=\"210\" width=\"400\" alt=\"Picture of a door opening to a hallway. A person's shadow is cast on the door and hallway.\" src=\"images/exemplarSection01_title.png\"/></div><h2 class=\"passage-title\">An Unbelievable Night</h2><p class=\"author-line\">by Franz Hohler</p><p><span data-catalog-idref=\"c1234\">Anina</span> was ten years old, so even half asleep she could find her way from her room to the bathroom. The door to her room was usually open a crack, and the nightlight in the hallway made it light enough to get to the bathroom past the telephone stand.</p></qti-stimulus-body>\n  <qti-catalog-info>\n    <qti-catalog id=\"c1234\">\n      <qti-card support=\"linguistic-guidance\">\n        <qti-html-content>Anina is the name of a girl.</qti-html-content>\n      </qti-card>\n    </qti-catalog>\n  </qti-catalog-info>\n</qti-assessment-stimulus>",
  "createdAt": "2025-02-19T03:22:34.382Z",
  "updatedAt": "2025-02-19T03:22:34.382Z",
  "__v": 0
}

```

