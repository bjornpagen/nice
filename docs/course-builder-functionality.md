Course Builder Course Generation

Course
- title: string
- description: string
- subject: string (e.g., "Math", "Science")
- grades: string[] (e.g., ["6th","7th"])
Structure
- units: Unit[]
- Unit = { id: string; title: string; lessons: Lesson[] }
- Lesson = { id: string; title: string; resources: LessonResource[] }
- LessonResource = { id: string; title: string; type: "Article"|"Video"|"Exercise"; xp: number }
Derived
- slug (from title)
- sortOrder for units/lessons/resources (their array indices)

SO this is what esentiallty gets passed into the course generate button


### Course
first we will need to build out the course object... the course object  
will look somehting like this for example:

```
{
  "sourcedId": "nice_x230b3ff252126bb6",
  "status": "active",
  "title": "Nice Academy - High school biology",
  "subjects": [
    "Science"
  ],
  "grades": [
    9
  ],
  "courseCode": "hs-bio",
  "org": {
    "sourcedId": "f251f08b-61de-4ffa-8ff3-3e56e1d75a60",
    "type": "district"
  },
  "academicSession": {
    "sourcedId": "Academic_Year_2025-2026",
    "type": "term"
  },
  "metadata": {
    "timebackVisible": "true",
    "primaryApp": "nice_academy",
    "khanId": "x230b3ff252126bb6",
    "khanSlug": "hs-bio",
    "khanSubjectSlug": "science",
    "khanTitle": "High school biology",
    "khanDescription": "Learn high school biology using videos, articles, and NGSS-aligned practice. Explore the fundamentals of cells, organism growth and development, photosynthesis and cellular respiration, molecular and classical genetics, natural selection and evolution, biodiversity and human impacts, and ecology.",
    "AlphaLearn": {
      "publishStatus": "active"
    },
    "metrics": {
      "totalXp": 1435,
      "totalLessons": 98
    }
  }
}
```
In the server action we will
1. append Nice Academy - to the name of the course the user provides
2. generate an id for the course liek nice_ + function generateId(): string {return `x${crypto.randomBytes(8).toString("hex")}`
3. derive a coure slug form the title (e.g Middle School Supplementary science -->  middle-school-supplementary-science (you can append a - 3random characters to avoid ever having courses with the same slug)
4. in the metadata keep everything the same with the timebackVisible, primaryApp, change khan id to the id of the course - nice_, khan slug is the slug we made of the course code as well, subject slug is dervied form the subject the user chooses, title and direction is all from the user, and keep the alphalearn objec tthe same.
5. the subkects object outsidse of the metadata is derived form the user, so are the grades, and the org and academic session will always be the same
6. For the metrics, this is why you may hold off and create the course at the end or maybe you can.... lessons refers to the number of exercises (becuase theyre the only like assesments so theyre considered lesson), and the totalXp is derived from the total # of xp form all of the resources in the course




### Course Components

## Units 
- Ex. Object
```
{
    "sourcedId": "nice_x6df2ab8d3018db16",
    "status": "active",
    "title": "Ecology and natural systems",
    "course": {
      "sourcedId": "nice_x230b3ff252126bb6",
      "type": "course"
    },
    "sortOrder": 0,
    "metadata": {
      "khanId": "x6df2ab8d3018db16",
      "khanSlug": "x230b3ff252126bb6:ecology-and-natural-systems",
      "khanTitle": "Ecology and natural systems",
      "khanDescription": "Are you ready to explore the fascinating world of biology? We’ll begin our journey with this unit, learning about the organization of natural systems and how life is distributed across the globe. We'll also examine the ecological concepts of species niches, population growth, and ecological interactions.\n\n**Unit guides are here!** Power up your classroom with engaging strategies, tools, and activities from Khan Academy’s learning experts. [**Doc**](https://bit.ly/3G1eJs0) | [**PDF**](https://bit.ly/42n3hzI)"
    }
  }
```

## Lessons
- Ex. Object
```
 {
    "sourcedId": "nice_xe663b31e98815332",
    "status": "active",
    "title": "Organization of natural systems",
    "course": {
      "sourcedId": "nice_x230b3ff252126bb6",
      "type": "course"
    },
    "parent": {
      "sourcedId": "nice_x6df2ab8d3018db16",
      "type": "courseComponent"
    },
    "sortOrder": 0,
    "metadata": {
      "khanId": "xe663b31e98815332",
      "khanSlug": "x230b3ff252126bb6:organization-of-natural-systems",
      "khanTitle": "Organization of natural systems",
      "khanDescription": "Examine how life is organized across levels—from populations and communities to ecosystems and the entire biosphere. Explore how biotic and abiotic factors interact across these levels and how natural systems are connected."
    }
  }
```

In the server action we will
1. derive sourced id for lessons and units the same exact way 
2. title gets filled from the users input of the title of the lesson or unit
3. the course will refer to the course we create at the beginning
4. we will maintain the exact order of the course structure that the user provides for us the course structure when they hit the generate course button
5. just like the course, the khan id is the sourced id minus the nice_
6. and just like the course the khna slug will be derived from the title of the unit/lesson
7. tghe title will be the title the user gives, and the description will be some generated descriptions


### Resources

## This is the fun part
- we will no longer be reusing resources from other courses... thats simply not possible in our case and i will show you why and what we need to do 
- Ex. Resource Object

```
{
    "sourcedId": nice_x2d6cda30fa6cbafb"",
    "status": "active",
    "title": "r-selected and K-selected population growth strategies",
    "vendorResourceId": "nice-academy-x2d6cda30fa6cbafb",
    "vendorId": "superbuilders",
    "applicationId": "nice",
    "roles": [
      "primary"
    ],
    "importance": "primary",
    "metadata": {
      "khanId": "x2d6cda30fa6cbafb",
      "khanSlug": "k-selected-and-r-selected-population-growth-strategies",
      "khanTitle": "r-selected and K-selected population growth strategies",
      "khanDescription": "r and K are two extremes for a range of population growth strategies. K-selected species, like elephants, are typically larger, live longer, and produce fewer offspring. Conversely, r-selected species, such as frogs, are generally smaller, have shorter lifespans, and produce a larger number of offspring. These strategies are shaped by various factors, including environmental conditions and the level of competition for resources.",
      "path": "/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity",
      "type": "interactive",
      "toolProvider": "Nice Academy",
      "khanActivityType": "Video",
      "launchUrl": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/v/k-selected-and-r-selected-population-growth-strategies",
      "url": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/v/k-selected-and-r-selected-population-growth-strategies",
      "khanYoutubeId": "ey4FTyYjiPw",
      "xp": 7,
      "learningObjectiveSet": [
        {
          "source": "CASE",
          "learningObjectiveIds": [
            "03e2f3e6-b2f6-11e9-830b-0242ac150005",
            "03e2f54e-b2f6-11e9-9267-0242ac150005",
            "03e2f76a-b2f6-11e9-ab49-0242ac150005"
          ]
        }
      ]
    }
  },
  {
    "sourcedId": "nice_x44a58c50251e532e",
    "status": "active",
    "title": "r-selected and K-selected species",
    "vendorResourceId": "nice-academy-x44a58c50251e532e",
    "vendorId": "superbuilders",
    "applicationId": "nice",
    "roles": [
      "primary"
    ],
    "importance": "primary",
    "metadata": {
      "khanId": "x44a58c50251e532e",
      "khanSlug": "r-and-k-selected-species",
      "khanTitle": "r-selected and K-selected species",
      "path": "/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity",
      "type": "interactive",
      "toolProvider": "Nice Academy",
      "khanActivityType": "Article",
      "launchUrl": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/a/r-and-k-selected-species",
      "url": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/a/r-and-k-selected-species",
      "xp": 2,
      "learningObjectiveSet": [
        {
          "source": "CASE",
          "learningObjectiveIds": [
            "03e2f3e6-b2f6-11e9-830b-0242ac150005",
            "03e2f54e-b2f6-11e9-9267-0242ac150005",
            "03e2f76a-b2f6-11e9-ab49-0242ac150005"
          ]
        }
      ]
    }
  },
  {
    "sourcedId": "nice_x102198758e4289af",
    "status": "active",
    "title": "Understand: describing populations and their growth",
    "vendorResourceId": "nice-academy-x102198758e4289af",
    "vendorId": "superbuilders",
    "applicationId": "nice",
    "roles": [
      "primary"
    ],
    "importance": "primary",
    "metadata": {
      "khanId": "x102198758e4289af",
      "khanSlug": "understand-describing-populations-and-their-growth",
      "khanTitle": "Understand: describing populations and their growth",
      "khanDescription": "Check your understanding of population dispersion and growth models in this set of free, standards-aligned practice questions.",
      "path": "/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity",
      "type": "interactive",
      "toolProvider": "Nice Academy",
      "khanActivityType": "Exercise",
      "launchUrl": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/e/understand-describing-populations-and-their-growth",
      "url": "https://www.nice.academy/science/hs-bio/x230b3ff252126bb6:ecology-and-natural-systems/x230b3ff252126bb6:population-growth-and-carrying-capacity/e/understand-describing-populations-and-their-growth",
      "xp": 2,
      "passiveResources": null,
      "nice_passiveResources": [
        "nice_x0d40fa1bfb5151f2",
        "nice_x44fd950a3c825d2d",
        "nice_x32a950e6",
        "nice_xa79ff81aa1d11c32",
        "nice_x660fbdd20baa3ca1",
        "nice_x2d6cda30fa6cbafb",
        "nice_x44a58c50251e532e"
      ],
      "learningObjectiveSet": [
        {
          "source": "CASE",
          "learningObjectiveIds": [
            "03e2f3e6-b2f6-11e9-830b-0242ac150005",
            "03e2f54e-b2f6-11e9-9267-0242ac150005",
            "03e2f76a-b2f6-11e9-ab49-0242ac150005"
          ]
        }
      ]
    }
  }
```

# In their, is an example of an article, video, and exercise
-In the server action this is what we will do
- Articles/Videos
	- We will keep everything the same from the resource object we get from the page but change 5 things
		1. sourced id. since we arent reusisng we have to change the resource's sourced id which will be genrated just like we generate another id the nice_ + hex 6 with a prefix of x
		2. from that we will also have to replace the vendor resource id which will get changed to nice-academy-(same hex with prefix x)
		3. metadata.khan - same as sourced id minus the nice_
		4. metadata.path - this path is no good.. the path will now be constructed form the course.metadata.khanSubjectSlug/course.metadata.khanSlug/unit.khanSlug/lesson.khanSlug/(a or v)/sameSlug for the resource
		5. the url and LaunchUlr will also be updated form the saem domain but to that new path
		6. everythibnng else remains the same
- Exercises
	- For exercises, we will keep everything the exact exact same from the resource object just exactly like we did with everything for the articles and videos.. that all applies to exercises as well
		1. howeverm for exercises they have a special nice_passiveResource filed in their metadata... analyze src/lib/payloads/oneroster/course.ts to understand how we set this field but it will be in a lesson all of the passive resources (videos and articles) before this exercises until the exercises before it ...


### Component Resources

Component Resource ex. object

```
 {
    "sourcedId": "nice_xe91b402d86d60e32_x7771d81a",
    "status": "active",
    "title": "Cell theory [Video]",
    "courseComponent": {
      "sourcedId": "nice_xe91b402d86d60e32",
      "type": "courseComponent"
    },
    "resource": {
      "sourcedId": "nice_x7771d81a",
      "type": "resource"
    },
    "sortOrder": 0
  },
  {
    "sourcedId": "nice_xe91b402d86d60e32_x863d9450816eb615",
    "status": "active",
    "title": "The cellular basis of life [Article]",
    "courseComponent": {
      "sourcedId": "nice_xe91b402d86d60e32",
      "type": "courseComponent"
    },
    "resource": {
      "sourcedId": "nice_x863d9450816eb615",
      "type": "resource"
    },
    "sortOrder": 1
  },
  {
    "sourcedId": "nice_xe91b402d86d60e32_xb044c378fa5e035e",
    "status": "active",
    "title": "Cell biology and microscopy [Article]",
    "courseComponent": {
      "sourcedId": "nice_xe91b402d86d60e32",
      "type": "courseComponent"
    },
    "resource": {
      "sourcedId": "nice_xb044c378fa5e035e",
      "type": "resource"
    },
    "sortOrder": 2
  }
```

# Component resources will be quite easy since we did all of the heavy lifitng with the resources and course components
	1. the sourced is weill be derived from nice_ + courseComponent.metadata.khanId + _ + resource.metadata.khanId 
	2. the title just like in src/lib/payloads/oneroster/course.ts, we wukk append [Video], [Article], or [Exercise] to the title oif the resources
	3. and then intuiteivelt rhe course compnent will refer to the lesson, and thr eresource will refer to the resource and then the sourced id is the order of which the resource ocmes in a lesson


### Assessment Line Items

Assessment Line item (ALI) ex object:

```
 {
    "sourcedId": "nice_x660fbdd20baa3ca1_ali",
    "status": "active",
    "title": "Progress for: Population growth and carrying capacity",
    "componentResource": {
      "sourcedId": "nice_x161348bcbc73b4cf_x660fbdd20baa3ca1"
    },
    "course": {
      "sourcedId": "nice_x230b3ff252126bb6"
    },
    "metadata": {
      "lessonType": "article",
      "courseSourcedId": "nice_x230b3ff252126bb6"
    }
  },
  {
    "sourcedId": "nice_x2d6cda30fa6cbafb_ali",
    "status": "active",
    "title": "Progress for: r-selected and K-selected population growth strategies",
    "componentResource": {
      "sourcedId": "nice_x161348bcbc73b4cf_x2d6cda30fa6cbafb"
    },
    "course": {
      "sourcedId": "nice_x230b3ff252126bb6"
    },
    "metadata": {
      "lessonType": "video",
      "courseSourcedId": "nice_x230b3ff252126bb6"
    }
  }
   {
    "sourcedId": "nice_x02ee701005453f55_ali",
    "status": "active",
    "title": "Apply: the cellular basis of life",
    "componentResource": {
      "sourcedId": "nice_xe91b402d86d60e32_x02ee701005453f55"
    },
    "course": {
      "sourcedId": "nice_x230b3ff252126bb6"
    },
    "metadata": {
      "lessonType": "exercise",
      "courseSourcedId": "nice_x230b3ff252126bb6"
    }
  }
```

# ALI's Based off everything else we did will be genrally easy
	1. the soruced id is dervied form the sourced id of the resources new sourced id + _ali
	2. the title for articles and video will have Progress for: appended to the title of the resource
	3. these will refer to the componentResource that we create before this.. andthe new courses Sourced Id will be refernece in the course object and metadata




### QTI FOR EXERCISES

Currently when a user goes to a exercises page.. the way we get the test from qti is by referencing the assessment test sourcedid which is identical to the sourced id of the resource...

Example of a qti asessment test

```
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<qti-assessment-test xmlns=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\" identifier=\"nice_x2e2d46900cbd4444\" title=\"Interpret constants of proportionality\">\n    <qti-outcome-declaration identifier=\"SCORE\" cardinality=\"single\" base-type=\"float\">\n        <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\n    </qti-outcome-declaration>\n    <qti-test-part identifier=\"PART_1\" navigation-mode=\"nonlinear\" submission-mode=\"individual\">\n        <qti-assessment-section identifier=\"SECTION_x2e2d46900cbd4444_BUCKET_0\" title=\"Interpret constants of proportionality\" visible=\"false\">\n\t\t\t\t\t            <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t\t\t\t            <qti-ordering shuffle=\"true\"/>\n\t\t\t\t\t            <qti-assessment-item-ref identifier=\"nice_x7ceacb5366c7b2e6_14978\" href=\"/assessment-items/nice_x7ceacb5366c7b2e6_14978\" sequence=\"1\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_xfb3004174472e502_33624\" href=\"/assessment-items/nice_xfb3004174472e502_33624\" sequence=\"2\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_xbbc564d4e4909490_81756\" href=\"/assessment-items/nice_xbbc564d4e4909490_81756\" sequence=\"3\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_xe8ae768caf0e7e43_55865\" href=\"/assessment-items/nice_xe8ae768caf0e7e43_55865\" sequence=\"4\"></qti-assessment-item-ref>\n\t\t\t\t\t        </qti-assessment-section>\n        <qti-assessment-section identifier=\"SECTION_x2e2d46900cbd4444_BUCKET_1\" title=\"Interpret constants of proportionality\" visible=\"false\">\n\t\t\t\t\t            <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t\t\t\t            <qti-ordering shuffle=\"true\"/>\n\t\t\t\t\t            <qti-assessment-item-ref identifier=\"nice_x2898e7bc9767d2ee_79568\" href=\"/assessment-items/nice_x2898e7bc9767d2ee_79568\" sequence=\"1\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_xb40ac11f7410c85f_83076\" href=\"/assessment-items/nice_xb40ac11f7410c85f_83076\" sequence=\"2\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_x47ae491a573dbfff_27328\" href=\"/assessment-items/nice_x47ae491a573dbfff_27328\" sequence=\"3\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_x1ddbb21d8b611ec1_52171\" href=\"/assessment-items/nice_x1ddbb21d8b611ec1_52171\" sequence=\"4\"></qti-assessment-item-ref>\n\t\t\t\t\t        </qti-assessment-section>\n        <qti-assessment-section identifier=\"SECTION_x2e2d46900cbd4444_BUCKET_2\" title=\"Interpret constants of proportionality\" visible=\"false\">\n\t\t\t\t\t            <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t\t\t\t            <qti-ordering shuffle=\"true\"/>\n\t\t\t\t\t            <qti-assessment-item-ref identifier=\"nice_x66877428a38eb46a_10981\" href=\"/assessment-items/nice_x66877428a38eb46a_10981\" sequence=\"1\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_x4c91fe813749016a_21878\" href=\"/assessment-items/nice_x4c91fe813749016a_21878\" sequence=\"2\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_xdd5858c65c8487a5_27615\" href=\"/assessment-items/nice_xdd5858c65c8487a5_27615\" sequence=\"3\"></qti-assessment-item-ref>\n\t\t\t\t\t        </qti-assessment-section>\n        <qti-assessment-section identifier=\"SECTION_x2e2d46900cbd4444_BUCKET_3\" title=\"Interpret constants of proportionality\" visible=\"false\">\n\t\t\t\t\t            <qti-selection select=\"1\" with-replacement=\"false\"/>\n\t\t\t\t\t            <qti-ordering shuffle=\"true\"/>\n\t\t\t\t\t            <qti-assessment-item-ref identifier=\"nice_x1f0557359ba1aaae_83223\" href=\"/assessment-items/nice_x1f0557359ba1aaae_83223\" sequence=\"1\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_x0ba3555a4eb4fd64_93060\" href=\"/assessment-items/nice_x0ba3555a4eb4fd64_93060\" sequence=\"2\"></qti-assessment-item-ref>\n                <qti-assessment-item-ref identifier=\"nice_x71533b9d7caa5f93_80559\" href=\"/assessment-items/nice_x71533b9d7caa5f93_80559\" sequence=\"3\"></qti-assessment-item-ref>\n\t\t\t\t\t        </qti-assessment-section>\n    </qti-test-part>\n</qti-assessment-test>",

```

1. You need to review the src/lib/qti.ts sdk to figure out how like we can fetch the test for every exercise, and copy it and then reuploda it with a new identifier that is the exact sourced id as the new sourced id for that exercise
2. these will be post operation becasuse since we are uplaoding the same object but just with a different identifier, it will be a new thing to post a