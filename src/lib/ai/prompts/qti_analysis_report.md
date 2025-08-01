# Comprehensive QTI Question Analysis Report

## Executive Summary

- **Total Questions Analyzed:** 2230
- **Questions with Issues:** 59
- **Total Issues Identified:** 52
- **Failure Rate:** 2.6%

## Issue Categories Analysis

### Oversimplified SVG Generation
**Severity:** CRITICAL  
**Questions Affected:** 19  
**Description:** AI generating basic geometric shapes instead of educationally accurate representations

**Issues:**
- nice_x0baff7f9f712fb01_0002: oversimplified svg diagram that doesn't show true place value blocks
- nice_x237966d4c7a16190_0001: oversimplified svg that doesn't display true ruler... either use khan image or create a true perfect ruler and svg representation to perfectly represent the question
- nice_x9584fb7aebc7ee38_0005: oversimplified svg that doesn't display true ruler
- nice_x11d341e68c171828_0005: oversimplified svg that doesn't display true ruler
- nice_x037705e6402daa31_0002: oversimplified svg should use an enlarged soccer ball emoji with an html line and the same width as the soccer ball measuring its diameter
- nice_xb41c5ce248261eb5_0001: oversimplified svg... number lines are good but should show the jumps from the start points to the next point labeled +#
- nice_x47e19cfe608f5c3b_0002: oversimplified svg that does not display true place value blocks
- nice_xb148a1e03bb5ac48_0004: oversimplified svg that does not display true place value blocks
- nice_x9367b4d76b1c82ef_0005: oversimplified svg the ai should understand exactly what the original khan image shows and use assets like emojis + proper html to truly display the content of the question
- nice_x1dbca00af2323dd1_0005: oversimplified svg needs proper representation
- ... and 10 more issues

### Question Logic Errors
**Severity:** CRITICAL  
**Questions Affected:** 3  
**Description:** Multiple correct answers in single-choice questions, unclear logic, or missing options

**Issues:**
- nice_x50475b7fa909596c_0004: this should be a multiple select question... but its only multiple choice one answer
- nice_x459f078521c58645_0003: answer A and C should both be correct and this should be multiple select
- nice_x30914dd5209d8ee4_0001: both answer choices in this multiple select are correct we should have 4 options

### Educational Accuracy Problems
**Severity:** CRITICAL  
**Questions Affected:** 3  
**Description:** Content not appropriate for 2nd grade level or mathematically incorrect

**Issues:**
- nice_xd43013615f136efc_0005: terrible number line implementation
- nice_x8f8a5541e995fd9e_0003: terribly constructed question svg are oversimplified and its shitty this isn't ready for students
- nice_xbf4db36c38e7515a_0003: terribly constructed question svg are oversimplified and its shitty this isn't ready for students

### Content Quality Issues
**Severity:** MEDIUM  
**Questions Affected:** 16  
**Description:** Random questions, lack of context, or answers given away in content

**Issues:**
- nice_x357acbba4cc9462c_0003: good number lines, however the jumps between the points should show + or - the number
- nice_x82f67f2e8546eed8_0005: oversimplified number line missing jump indicators
- nice_x400017b097ce6e49_0004: oversimplified number line missing jump indicators
- nice_xf20621b19f1ca1ad_0001: great example of a number line (reference for good implementation)
- nice_xed277c00cc2f11f0_0005: oversimplified png, cube doesn't work
- nice_xf7e3dd1bce376407_0003: weird question no visual content if needed just a weird note + dots aren't correctly placed
- nice_x071a67e238d17911_0001: this is perfect (reference for good implementation)
- nice_xb1c48c11e70dbdae_0005: note gives away answer
- nice_xb1c48c11e70dbdae_0004: note gives away answer
- nice_x3bf67409b2d2116a_0001: picture graph doesn't represent names
- ... and 6 more issues

### Differentiation Consistency Failures
**Severity:** CRITICAL  
**Questions Affected:** 1  
**Description:** Differentiated questions that completely abandon the original visualization type and question concept, breaking educational consistency

**Issues:**
- nice_x9ea83288fcf4e040_0005: differentiation completely changed from dot plot to simple number line, changed question type from "typical value analysis" to "range calculation" - breaks consistency with original statistical concept

### Box Plot Visualization Failures
**Severity:** CRITICAL  
**Questions Affected:** 1  
**Description:** Box plots displaying as simple horizontal lines instead of proper statistical visualizations

**Issues:**
- nice_xbb16095ab6a4e921_0001: box plot shows only horizontal line instead of proper box plot with quartiles, median, and whiskers; needs proper ticks on number lines; ensure nothing gets cut off when rendered

### Rendering/Display Failures
**Severity:** HIGH  
**Questions Affected:** 7  
**Description:** SVG content not displaying properly, getting cut off, or overlapping

**Issues:**
- nice_xce418da045da08ea_0001: emojis get cut off
- nice_x503aedf7937758eb_0003: image doesn't render either using placeholder image or non renderable simplified svg
- nice_xa67fea6e7226c92b_0003: number line gets cut off when rendered needs to be fixed
- nice_x8596dbd12ec9a8a1_0001: dots plot isn't rendered
- nice_x4d4c4f5c1e0e9fc2_0004: number lines don't render
- nice_x4d4c4f5c1e0e9fc2_0001: number lines don't render
- nice_x44dc31eced947662_0004: rendering is off there's no spaces for the number and the words

### Asset/Image Misuse
**Severity:** HIGH  
**Questions Affected:** 1  
**Description:** Not using Khan Academy images, placeholder images, or inappropriate emoji usage

**Issues:**
- nice_xf48d1d021b7d0767_0001: not bad but prefer to use khan coin image

### Answer Choice Problems
**Severity:** HIGH  
**Questions Affected:** 0  
**Description:** Issues with answer selection types, missing choices, or incorrect validation

## Detailed Question Analysis

### CRITICAL Priority Issues

#### nice_xbb16095ab6a4e921_0001
**Title:** Range from a Box Plot: Snack Prices Variation 1  
**Khan Exercise:** Box plot statistics  
**Khan Slug:** box-plot-statistics  

**Issues Identified:**
- box plot shows only horizontal line instead of proper box plot with quartiles, median, and whiskers; needs proper ticks on number lines; ensure nothing gets cut off when rendered

**Additional SVG Analysis:**
- SVG displays only a horizontal line (rect with height='2') instead of a proper box plot
- Missing quartile boxes, median line, and whiskers that define a box plot
- Number line lacks tick marks for proper scale reading
- Current implementation is educationally misleading for statistics instruction

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xbb16095ab6a4e921_0001"
    title="Range from a Box Plot: Snack Prices Variation 1"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="float">
        <qti-correct-response>
            <qti-value>1.3</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='330'%20height='148'%20viewBox='0%200%20330%20148'%3E%3Crect%20x='0'%20y='73'%20width='330'%20height='2'%20fill='black'/%3E%3Ctext%20x='10'%20y='140'%20font-size='14'%3E0.20%3C/text%3E%3Ctext%20x='320'%20y='140'%20font-size='14'%3E1.50%3C/text%3E%3C/svg%3E"
                 alt="A horizontal box plot showing values from 0.20 dollars to 1.50 dollars." width="330" height="148"/>
            <p><span class="qti-italic">Note: The minimum value shown is 0.20 dollars and the maximum value is 1.50 dollars.</span></p>
        </div>
        <p>Find the range of the data (in dollars).</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="4"/>
            dollars
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The range is calculated as 1.50 - 0.20 = 1.30 dollars.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember, the range is the difference between the largest and the smallest values.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x9ea83288fcf4e040_0005
**Title:** Range of Daily Temperatures  
**Original Source:** Typical Number of Cavities (Dot Plot Question)  
**Differentiation Type:** FAILED - Complete Concept Change  

**Issues Identified:**
- differentiation completely changed from dot plot to simple number line, changed question type from "typical value analysis" to "range calculation" - breaks consistency with original statistical concept

**Critical Problems:**
1. **Visualization Type Abandonment:** Original used a complex dot plot with stacked data points; differentiated version uses a basic number line with only endpoints
2. **Statistical Concept Change:** Original taught "typical value" interpretation from distributions; differentiated version teaches simple "range = max - min" calculation
3. **Educational Inconsistency:** Students learning dot plot interpretation suddenly encounter a completely different visualization type
4. **Assessment Mismatch:** Original required understanding of data clustering and frequency; differentiated version requires only basic subtraction

**Comparison Analysis:**
- **Original Question:** "Which of the following is a typical number of cavities?" (requires statistical reasoning about central tendency)
- **Bad Differentiation:** "Find the range of the daily temperatures" (requires only arithmetic: max - min)
- **Good Differentiation Example:** "Estimate the center of the quiz scores" (maintains dot plot format and statistical reasoning)

**Expected Differentiation Pattern:**
Proper differentiation should maintain:
- Same visualization type (dot plot)
- Same statistical concept family (central tendency, distribution analysis)
- Same level of complexity (interpreting clustered data)
- Different context/data only (sports scores vs. medical data vs. test scores)

**Complete XML (BAD EXAMPLE):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x9ea83288fcf4e040_0005"
    title="Range of Daily Temperatures"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>24</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='330'%20height='148'%20viewBox='0%200%20330%20148'%3E%0A%20%20%3Cline%20x1='10'%20y1='80'%20x2='320'%20y2='80'%20stroke='black'%20stroke-width='2'/%3E%0A%20%20%3Cline%20x1='10'%20y1='75'%20x2='10'%20y2='85'%20stroke='black'%20stroke-width='1'/%3E%0A%20%20%3Cline%20x1='165'%20y1='75'%20x2='165'%20y2='85'%20stroke='black'%20stroke-width='1'/%3E%0A%20%20%3Cline%20x1='320'%20y1='75'%20x2='320'%20y2='85'%20stroke='black'%20stroke-width='1'/%3E%0A%20%20%3Ctext%20x='10'%20y='120'%20font-size='14'%20text-anchor='start'%3E54°F%3C/text%3E%0A%20%20%3Ctext%20x='320'%20y='120'%20font-size='14'%20text-anchor='end'%3E78°F%3C/text%3E%0A%3C/svg%3E" 
                 alt="A number line with tick marks showing the endpoints 54°F and 78°F" width="330" height="148"/>
            <p><span class="qti-italic">Note: The number line displays the lowest and highest daily temperatures.</span></p>
        </div>
        <p>Find the range of the daily temperatures (in °F).</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
            °F
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The range is 78°F - 54°F = 24°F.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Subtract the lowest temperature from the highest to get the range.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

**Contrast with GOOD Differentiation Example (nice_x9ea83288fcf4e040_0004):**
- ✅ Maintains dot plot visualization
- ✅ Preserves statistical reasoning requirement
- ✅ Changes only context (quiz scores vs. cavities)
- ✅ Asks related but different question (center vs. typical value)
- ✅ Keeps same educational learning objective

---

#### nice_x0baff7f9f712fb01_0002
**Title:** Subtract using place-value blocks - Variant 3  
**Khan Exercise:** Subtract within 20 visually  
**Khan Slug:** subtract-within-20-visually  

**Issues Identified:**
- oversimplified svg diagram that doesn't show true place value blocks

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x0baff7f9f712fb01_0002"
    title="Subtract using place-value blocks - Variant 3"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>34</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='131' height='140' viewBox='0 0 131 140'%3E%3Crect x='0' y='0' width='131' height='140' fill='none' stroke='black' stroke-width='2'/%3E%3Ctext x='65.5' y='70' font-size='14' text-anchor='middle'%3E41 blocks, 7 crossed%3C/text%3E%3C/svg%3E" 
                 alt="An arrangement of 41 place-value blocks with 7 of them crossed out." width="131" height="140"/>
            <p><span class="qti-italic">Note: The image shows 41 place-value blocks, with 7 blocks crossed out.</span></p>
        </div>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>41</mn><mo>−</mo><mn>7</mn><mo>=</mo>
            </math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>41</mn><mo>−</mo><mn>7</mn><mo>=</mo><mn>34</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Subtracting 7 from 41 gives you 34.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x237966d4c7a16190_0001
**Title:** Measure the length of a Pencil  
**Khan Exercise:** Measure lengths (inch, ft)  
**Khan Slug:** measure-lengths-inch-ft  

**Issues Identified:**
- oversimplified svg that doesn't display true ruler... either use khan image or create a true perfect ruler and svg representation to perfectly represent the question

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x237966d4c7a16190_0001"
    title="Measure the length of a Pencil"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>6</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p>What is the length of the pencil shown?</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='320'%20height='224'%20viewBox='0%200%20320%20224'%3E%3Crect%20x='10'%20y='200'%20width='300'%20height='10'%20fill='%23000'%2F%3E%3Crect%20x='50'%20y='160'%20width='220'%20height='40'%20fill='%23007aff'%2F%3E%3C/svg%3E" 
                 alt="A blue pencil lying on a horizontal ruler. The pencil appears to extend from the left end (0 cm) to the 6 cm mark." 
                 width="320" height="224"/>
            <p><span class="qti-italic">Note: The pencil’s left end aligns with the 0 cm mark and its right end with the 6 cm mark on the ruler.</span></p>
        </div>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/> inches
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The pencil spans 6 inches along the ruler.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> According to the ruler, the pencil starts at 0 inches and ends at 6 inches, so its length is 6 inches.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x9584fb7aebc7ee38_0005
**Title:** Find the length of the branch  
**Khan Exercise:** Measure lengths (cm, m)  
**Khan Slug:** measuring-lengths-2  

**Issues Identified:**
- oversimplified svg that doesn't display true ruler

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x9584fb7aebc7ee38_0005"
    title="Find the length of the branch"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>15</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p>What is the length of the branch?</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='256' viewBox='0 0 320 256'%3E%3Crect width='320' height='256' fill='white'/%3E%3Ctext x='160' y='128' font-size='24' text-anchor='middle' fill='darkgreen'%3EBranch: 15cm%3C/text%3E%3C/svg%3E" 
                 alt="A branch placed against a ruler, extending from 0 to 15 centimeters."/>
            <p><span class="qti-italic">Note: The branch starts at 0 cm and ends at 15 cm on the ruler.</span></p>
        </div>
        
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
            centimeters
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The branch measures exactly <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>15</mn></math> centimeters.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Since the branch runs from 0 cm to 15 cm, its length is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>15</mn></math> centimeters.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x11d341e68c171828_0005
**Title:** Measure the edge length of a toy cube  
**Khan Exercise:** Measure lengths (cm, m)  
**Khan Slug:** measuring-lengths-2  

**Issues Identified:**
- oversimplified svg that doesn't display true ruler

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x11d341e68c171828_0005"
    title="Measure the edge length of a toy cube"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>6</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p>What is the edge length of the toy cube?</p>
    
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='265' height='206'%3E%3Ctext x='20' y='30' font-size='20'%3E0 cm%3C/text%3E%3Ctext x='220' y='30' font-size='20'%3E6 cm%3C/text%3E%3Crect x='70' y='80' width='120' height='120' fill='red'/%3E%3C/svg%3E"
                 alt="A toy cube shown on a ruler from 0 cm to 6 cm." width="265" height="206"/>
            <p><span class="qti-italic">Note: The cube’s edge extends from the 0 cm mark to the 6 cm mark on the ruler.</span></p>
        </div>
    
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="1"/> centimeters
        </p>
    
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The toy cube’s edge is exactly 6 centimeters long.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Use the ruler to see that the cube extends from 0 cm to 6 cm.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
    
</qti-assessment-item>
```

---

#### nice_x037705e6402daa31_0002
**Title:** Measure the width of the soccer ball  
**Khan Exercise:** Measure lengths (inch, ft)  
**Khan Slug:** measure-lengths-inch-ft  

**Issues Identified:**
- oversimplified svg should use an enlarged soccer ball emoji with an html line and the same width as the soccer ball measuring its diameter

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x037705e6402daa31_0002"
    title="Measure the width of the soccer ball"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>2</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>What is the width of the soccer ball?</p>

        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='265'%20height='206'%20viewBox='0%200%20265%20206'%3E%3Ctext%20x='10'%20y='100'%20font-size='18'%3ESoccer%20ball:%200-2%20inches%3C/text%3E%3C/svg%3E"
                 alt="A soccer ball placed against a ruler." width="265" height="206"/>
            <p><span class="qti-italic">Note: The image indicates the soccer ball spans from the 0-inch mark to the 2-inch mark.</span></p>
        </div>

        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
             inches
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The soccer ball’s width is 2 inches.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Look at the ruler: the soccer ball extends from 0 to 2 inches.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xb41c5ce248261eb5_0001
**Title:** Adding blocks with a number line  
**Khan Exercise:** Add and subtract on the number line word problems  
**Khan Slug:** adding-and-subtracting-on-the-number-line-word-problems  

**Issues Identified:**
- oversimplified svg... number lines are good but should show the jumps from the start points to the next point labeled +#

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xb41c5ce248261eb5_0001"
    title="Adding blocks with a number line"
    time-dependent="false"
    xml:lang="en-US">
  
  <qti-response-declaration identifier="RESPONSE_LINE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>A</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-response-declaration identifier="RESPONSE_TOTAL" cardinality="single" base-type="integer">
    <qti-correct-response>
      <qti-value>98</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
  
  <qti-item-body>
    <p>Alex had a tower with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>53</mn></math> blocks.</p>
    <p>He added <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>15</mn></math> green blocks, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>20</mn></math> yellow blocks, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn></math> red blocks.</p>

    <qti-choice-interaction response-identifier="RESPONSE_LINE" shuffle="true" min-choices="1" max-choices="1">
      <qti-prompt>Which number line shows how to find the total number of blocks Alex has now?</qti-prompt>
      <qti-simple-choice identifier="A">
        <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%20viewBox='0%200%20420%20120'%3E%3C!-- Number line starting at 53: jump +15 to 68, then +20 to 88, then +10 to unknown --%3E%3Cline%20x1='20'%20y1='60'%20x2='400'%20y2='60'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='20'%20y='80'%20font-size='12'%20text-anchor='middle'%3E53%3C/text%3E%3Ctext%20x='150'%20y='80'%20font-size='12'%20text-anchor='middle'%3E68%3C/text%3E%3Ctext%20x='260'%20y='80'%20font-size='12'%20text-anchor='middle'%3E88%3C/text%3E%3Ctext%20x='380'%20y='80'%20font-size='12'%20text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E" 
             alt="Number line starting at 53 with jumps of +15, +20, and +10 showing final number as unknown."/>
      </qti-simple-choice>
      <qti-simple-choice identifier="B">
        <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%20viewBox='0%200%20420%20120'%3E%3C!-- Distractor: Number line beginning at 0 with equal jumps (misaligned) --%3E%3Cline%20x1='20'%20y1='60'%20x2='400'%20y2='60'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='20'%20y='80'%20font-size='12'%20text-anchor='middle'%3E0%3C/text%3E%3Ctext%20x='150'%20y='80'%20font-size='12'%20text-anchor='middle'%3E15%3C/text%3E%3Ctext%20x='260'%20y='80'%20font-size='12'%20text-anchor='middle'%3E30%3C/text%3E%3Ctext%20x='380'%20y='80'%20font-size='12'%20text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E" 
             alt="Number line starting at 0 with jumps of +15, +15, +15 which do not match the additions."/>
      </qti-simple-choice>
    </qti-choice-interaction>

    <p>How many blocks does Alex have now?</p>
    <p><qti-text-entry-interaction response-identifier="RESPONSE_TOTAL" expected-length="3"/> blocks</p>

    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Correct!</span> Calculating: 53 + 15 = 68; 68 + 20 = 88; 88 + 10 = 98 blocks.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Not quite.</span> Try adding each group sequentially: 53 + 15, then add 20, then add 10 to find the total.</p>
      </qti-content-body>
    </qti-feedback-block>
  </qti-item-body>

  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-and>
          <qti-match>
            <qti-variable identifier="RESPONSE_LINE"/>
            <qti-correct identifier="RESPONSE_LINE"/>
          </qti-match>
          <qti-match>
            <qti-variable identifier="RESPONSE_TOTAL"/>
            <qti-correct identifier="RESPONSE_TOTAL"/>
          </qti-match>
        </qti-and>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">CORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_xd43013615f136efc_0005
**Title:** Addition on a number line (Variation 5)  
**Khan Exercise:** Add within 100 using a number line  
**Khan Slug:** add-sub-within-100-w-num-line  

**Issues Identified:**
- terrible number line implementation

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xd43013615f136efc_0005"
    title="Addition on a number line (Variation 5)"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>71</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='120'%20viewBox='0%200%20300%20120'%3E%3Cline%20x1='50'%20y1='80'%20x2='250'%20y2='80'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='50'%20y='100'%20font-size='12'%20text-anchor='middle'%3E55%3C/text%3E%3Ctext%20x='150'%20y='100'%20font-size='12'%20text-anchor='middle'%3E65%3C/text%3E%3Ctext%20x='250'%20y='100'%20font-size='12'%20text-anchor='middle'%3E71%3C/text%3E%3Cpath%20d='M50%2080%20Q100%2020,150%2080'20%20fill='none'%20stroke='blue'%20stroke-width='2'/%3E%3Ctext%20x='100'%20y='25'%20font-size='14'%20text-anchor='middle'%3E%2B10%3C/text%3E%3Cpath%20d='M150%2080%20Q200%2020,250%2080'20%20fill='none'%20stroke='blue'%20stroke-width='2'/%3E%3Ctext%20x='200'%20y='25'%20font-size='14'%20text-anchor='middle'%3E%2B6%3C/text%3E%3C/svg%3E"
                 alt="A number line with three points: 55, 65, and 71. The first arc labeled '+10' goes from 55 to 65, and the second arc labeled '+6' goes from 65 to 71." width="300" height="120"/>
            <p><span class="qti-italic">Note: The number line starts at 55. The first jump moves 10 units to reach 65, then 6 more to reach 71.</span></p>
        </div>
        <p><span class="qti-italic">Use the number line to help you add <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>+</mo><mn>16</mn></math>.</span></p>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>+</mo><mn>16</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>+</mo><mn>16</mn><mo>=</mo><mn>71</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Break 16 into 10 and 6. Starting at 55, add 10 to reach 65, then add 6 more to reach 71.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x47e19cfe608f5c3b_0002
**Title:** Subtraction with Place-Value Blocks: 725 minus 389  
**Khan Exercise:** Subtract within 1,000 using place value blocks  
**Khan Slug:** subtract-within-1000--level-2  

**Issues Identified:**
- oversimplified svg that does not display true place value blocks

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x47e19cfe608f5c3b_0002"
    title="Subtraction with Place-Value Blocks: 725 minus 389"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>336</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='560'%20viewBox='0%200%20400%20560'%3E%3Crect%20width='400'%20height='560'%20fill='lightblue'/%3E%3Ctext%20x='200'%20y='280'%20font-size='24'%20text-anchor='middle'%20fill='black'%3E725%E2%88%92389%20Diagram%3C/text%3E%3C/svg%3E" 
                 alt="A place-value chart showing blocks that represent 725 minus 389." width="400" height="560"/>
            <p><span class="qti-italic">Note: The diagram illustrates regrouping to subtract 389 from 725.</span></p>
        </div>

        <p><strong>Subtract.</strong> <span class="qti-italic">(Use the place-value blocks for help if needed.)</span></p>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>725</mn>
                <mo>−</mo>
                <mn>389</mn>
                <mo>=</mo>
            </math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Subtracting 389 from 725 gives 336.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Regroup the hundreds into tens properly; the correct result is 336.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xb148a1e03bb5ac48_0004
**Title:** Subtract Using Place-Value Blocks  
**Khan Exercise:** Subtract within 1,000 using place value blocks  
**Khan Slug:** subtract-within-1000--level-2  

**Issues Identified:**
- oversimplified svg that does not display true place value blocks

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xb148a1e03bb5ac48_0004"
    title="Subtract Using Place-Value Blocks"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>315</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='368'%20viewBox='0%200%20400%20368'%3E%3C!--%20Place-value%20chart%20for%20623%20and%20308--%3E%3Ctext%20x='10'%20y='30'%3E623:%206H,2T,3O%3C/text%3E%3Ctext%20x='10'%20y='60'%3E308:%203H,0T,8O%3C/text%3E%3C/svg%3E"
                 alt="A place-value chart displaying 623 represented with 6 hundred-blocks, 2 ten-blocks, and 3 one-blocks next to 308 represented with 3 hundred-blocks, 0 ten-blocks, and 8 one-blocks."
                 width="400" height="368"/>
            <p><span class="qti-italic">Note: Use regrouping if necessary when subtracting 308 from 623.</span></p>
        </div>

        <p>Subtract.</p>

        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>623</mn>
                <mo>&amp;minus;</mo>
                <mn>308</mn>
                <mo>=</mo>
            </math>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>623</mn><mo>&amp;minus;</mo><mn>308</mn><mo>=</mo><mn>315</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Be sure to regroup the tens if needed when subtracting 308 from 623.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x9367b4d76b1c82ef_0005
**Title:** Whale Shark Distance Estimation  
**Khan Exercise:** Estimate lengths (US Customary units)  
**Khan Slug:** estimate-lengths--us-customary-units-  

**Issues Identified:**
- oversimplified svg the ai should understand exactly what the original khan image shows and use assets like emojis + proper html to truly display the content of the question

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x9367b4d76b1c82ef_0005"
    title="Whale Shark Distance Estimation"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='130'%20viewBox='0%200%20400%20130'%3E%3Crect%20width='400'%20height='130'%20fill='%23FFF2CC'/%3E%3Ctext%20x='200'%20y='70'%20font-size='16'%20text-anchor='middle'%3ESeahorse%20near%20tide%20pools,%20Whale%20shark%20open%20water%3C/text%3E%3C/svg%3E"
                 alt="Illustration depicting a seahorse near tide pools and a whale shark in the open water." width="400" height="130"/>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Estimate the distance from the beach to the whale shark.</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>80</mn></math> feet
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="A">80 feet is too near based on the scene depicted.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>200</mn></math> feet
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="B">Correct! The whale shark is estimated to be about 200 feet from the beach.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>800</mn></math> feet
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="C">800 feet is far too distant given the illustration.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The whale shark is approximately <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>200</mn></math> feet from the beach.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Review the image: the whale shark is noticeably out in the open water, and 200 feet is the best estimate among the choices provided.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x1dbca00af2323dd1_0005
**Title:** Estimate book thickness  
**Khan Exercise:** Estimate lengths  
**Khan Slug:** estimating-lengths  

**Issues Identified:**
- oversimplified svg needs proper representation

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x1dbca00af2323dd1_0005"
    title="Estimate book thickness"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='200'%20viewBox='0%200%20400%20200'%3E%3Crect%20x='20'%20y='70'%20width='100'%20height='60'%20fill='%23fffacd'/%3E%3Ctext%20x='70'%20y='105'%20font-size='18'%20text-anchor='middle'%20fill='%23000'%3EPaperback:%201cm%3C/text%3E%3Crect%20x='240'%20y='40'%20width='140'%20height='120'%20fill='%23e6e6fa'/%3E%3Ctext%20x='310'%20y='100'%20font-size='18'%20text-anchor='middle'%20fill='%23000'%3ETextbook%3C/text%3E%3C/svg%3E"
                 alt="Image showing a thin paperback labeled 1 cm next to an unlabeled thick textbook."/>
            <p><span class="qti-italic">Note: The image shows a paperback book marked as 1 cm thick alongside a larger, unlabeled textbook.</span></p>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>The paperback book is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn></math> centimeters thick. About how thick is the large textbook?</qti-prompt>
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! A large textbook is roughly three times as thick.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1.5</mn></math> centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. 1.5 cm is too thin for a large textbook.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. 5 cm is more than three times 1 cm.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The large textbook is approximately 3 cm thick.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Since the paperback is 1 cm thick and the textbook is much thicker, 3 cm is the best estimate.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x970a9150e8bf3ed9_0001
**Title:** Dog Length Estimation  
**Khan Exercise:** Estimate lengths (US Customary units)  
**Khan Slug:** estimate-lengths--us-customary-units-  

**Issues Identified:**
- oversimplified svg that uses blocks, can use emojis which are on the same level and have like { to represent the height, the answer choices should be solvable for a 2nd grader which this course is intended for

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x970a9150e8bf3ed9_0001"
    title="Dog Length Estimation"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='200'%20viewBox='0%200%20400%20200'%3E%3Crect%20x='20'%20y='50'%20width='80'%20height='100'%20fill='%23ccc'/%3E%3Ctext%20x='60'%20y='170'%20font-size='16'%20text-anchor='middle'%3E6%20ft%3C/text%3E%3Crect%20x='150'%20y='70'%20width='60'%20height='60'%20fill='%23faa'/%3E%3Ctext%20x='180'%20y='150'%20font-size='16'%20text-anchor='middle'%3EDog%3C/text%3E%3C/svg%3E"
                 alt="A person and a dog; the person is labeled as 6 ft, and the dog appears shorter." width="400" height="200"/>
            <p><span class="qti-italic">Note: The person is labeled as 6 ft tall. The dog stands next to the person and appears shorter.</span></p>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="1">
            <qti-prompt>About how long is the dog?</qti-prompt>
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> feet
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> feet
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math> feet
            </qti-simple-choice>
        </qti-choice-interaction>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The dog appears shorter than the 6 ft tall person, so about 4 feet is a reasonable estimate.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Compare the dog to the person; the dog appears shorter than 6 ft, and 4 ft is the best estimate.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xf1177c89f645c9bc_0003
**Title:** Identify the value of a coin - U.S. Nickel  
**Khan Exercise:** Identify the value of US coins and dollars  
**Khan Slug:** identify-the-value-of-different-forms-of-money-us  

**Issues Identified:**
- oversimplified svg, the answer is labeled in the svg, for coins we should use the coin images from khan

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xf1177c89f645c9bc_0003"
    title="Identify the value of a coin - U.S. Nickel"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='80'%20height='80'%20viewBox='0%200%2080%2080'%3E%3Ccircle%20cx='40'%20cy='40'%20r='38'%20stroke='black'%20stroke-width='2'%20fill='lightgray'%20/%3E%3Ctext%20x='40'%20y='45'%20font-size='20'%20text-anchor='middle'%20fill='black'%3E5¢%3C/text%3E%3C/svg%3E"
                 alt="An image of a U.S. nickel." width="80" height="80"/>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="1">
            <qti-prompt>What is the value of the coin?</qti-prompt>
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>¢</mo></math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Not quite. That is the value of a penny.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>¢</mo></math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Correct! A nickel is worth 5¢.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>¢</mo></math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. That is the value of a dime.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="D">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>25</mn><mo>¢</mo></math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="D">Not quite. That is the value of a quarter.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> A U.S. nickel is worth 5¢.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember, a nickel is valued at 5¢.</p>
            </qti-content-body>
        </qti-feedback-block>        
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x50475b7fa909596c_0004
**Title:** Congruent Regions in Rectangles (Variant 4)  
**Khan Exercise:** Equal parts of rectangles  
**Khan Slug:** equal-parts-of-circles-and-rectangles  

**Issues Identified:**
- this should be a multiple select question... but its only multiple choice one answer

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd https://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x50475b7fa909596c_0004"
    title="Congruent Regions in Rectangles (Variant 4)"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
            <qti-value>C</qti-value>
            <qti-value>D</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true">
            <qti-prompt>Identify the rectangles whose regions are divided into two congruent parts.</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='140'%20height='80'%20viewBox='0%200%20140%2080'%3E%3Crect%20x='0'%20y='0'%20width='140'%20height='80'%20fill='%23FFFFFF'%20stroke='%23000'%20stroke-width='2'/%3E%3Cline%20x1='46.67'%20y1='0'%20x2='46.67'%20y2='80'%20stroke='%23000'%20stroke-width='2'/%3E%3Cline%20x1='93.33'%20y1='0'%20x2='93.33'%20y2='80'%20stroke='%23000'%20stroke-width='2'/%3E%3C/svg%3E"
                     alt="A rectangle divided into three parts."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Not quite. This rectangle is partitioned into three regions, not two equal halves.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='140'%20height='80'%20viewBox='0%200%20140%2080'%3E%3Crect%20x='0'%20y='0'%20width='140'%20height='80'%20fill='%23FFFFFF'%20stroke='%23000'%20stroke-width='2'/%3E%3Cline%20x1='0'%20y1='0'%20x2='140'%20y2='80'%20stroke='%23000'%20stroke-width='2'/%3E%3C/svg%3E"
                     alt="A rectangle bisected by a diagonal, creating two equal triangles."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Correct! The diagonal provides a perfect bisection into two congruent parts.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='140'%20height='80'%20viewBox='0%200%20140%2080'%3E%3Crect%20x='0'%20y='0'%20width='140'%20height='80'%20fill='%23FFFFFF'%20stroke='%23000'%20stroke-width='2'/%3E%3Cline%20x1='0'%20y1='40'%20x2='140'%20y2='40'%20stroke='%23000'%20stroke-width='2'/%3E%3C/svg%3E"
                     alt="A rectangle bisected by a horizontal line through its center."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Correct! The horizontal cut evenly divides the shape.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="D">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='140'%20height='80'%20viewBox='0%200%20140%2080'%3E%3Crect%20x='0'%20y='0'%20width='140'%20height='80'%20fill='%23FFFFFF'%20stroke='%23000'%20stroke-width='2'/%3E%3Cline%20x1='70'%20y1='0'%20x2='70'%20y2='80'%20stroke='%23000'%20stroke-width='2'/%3E%3C/svg%3E"
                     alt="A rectangle bisected by a vertical center line."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="D">Correct! The vertical division creates two identical halves.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Excellent!</span> You correctly identified all rectangles with congruent halves.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Only select the rectangles that are perfectly bisected into two equal regions.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x459f078521c58645_0003
**Title:** Identify the place-value model for 812  
**Khan Exercise:** Place value blocks within 1,000  
**Khan Slug:** place-value-blocks-within-1000  

**Issues Identified:**
- answer A and C should both be correct and this should be multiple select

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x459f078521c58645_0003"
    title="Identify the place-value model for 812"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which place value model shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>812</mn></math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='250'%20height='50'%3E%3Ctext%20x='10'%20y='30'%20font-size='20'%3E8%20hundreds%2C%201%20ten%2C%202%20ones%3C/text%3E%3C/svg%3E" alt="8 hundreds, 1 ten, 2 ones"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="A">Correct! 8 hundreds, 1 ten, and 2 ones represent 812.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='230'%20height='50'%3E%3Ctext%20x='10'%20y='30'%20font-size='20'%3E8%20hundreds%2C%2012%20ones%3C/text%3E%3C/svg%3E" alt="8 hundreds, 12 ones"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="B">Not quite. Grouping 12 ones without tens is not the standard model for 812.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='50'%3E%3Ctext%20x='10'%20y='30'%20font-size='20'%3E8%20hundreds%2C%201%20one%2C%202%20tens%3C/text%3E%3C/svg%3E" alt="8 hundreds, 1 one, 2 tens"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="C">Not quite. The places are mixed up; the model should have a ten place separate from ones.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The model with 8 hundreds, 1 ten, and 2 ones correctly represents 812.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> 812 is composed of 8 hundreds, 1 ten, and 2 ones. Make sure the tens and ones are correctly distinguished.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xb8cb373956f9f12c_0002
**Title:** Add using place value blocks - Variation 2  
**Khan Exercise:** Add within 1,000 using place value blocks  
**Khan Slug:** add-within-1000--level-2  

**Issues Identified:**
- oversimplified svg

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xb8cb373956f9f12c_0002"
    title="Add using place value blocks - Variation 2"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>704</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='368'%3E%3Crect%20x='0'%20y='0'%20width='400'%20height='368'%20fill='none'%20stroke='%23000'%20stroke-width='2'/%3E%3Ctext%20x='200'%20y='184'%20font-size='20'%20text-anchor='middle'%3EA%20place-value%20chart%3C/text%3E%3C/svg%3E"
                 alt="A place-value chart showing hundreds, tens, and ones blocks." width="400" height="368"/>
            <p><span class="qti-italic">Note: Use the place-value blocks to represent the sum of the two numbers below.</span></p>
        </div>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>576</mn>
                <mo>+</mo>
                <mn>128</mn>
                <mo>=</mo>
            </math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Adding the hundreds (500+100), tens (70+20), and ones (6+8) gives <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>704</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Break down 576 into 5 hundreds, 7 tens, and 6 ones, and 128 into 1 hundred, 2 tens, and 8 ones. Their sum is 6 hundreds, 9 tens, and 14 ones, and after regrouping the ones, you get <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>704</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xff00577e4af7fc2b_0003
**Title:** Add 752 and 138  
**Khan Exercise:** Add within 1,000 using place value blocks  
**Khan Slug:** add-within-1000--level-2  

**Issues Identified:**
- oversimplified svg

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xff00577e4af7fc2b_0003"
    title="Add 752 and 138"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>890</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Add. <span class="qti-italic">Use the place-value blocks to help solve.</span></p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='368'%20viewBox='0%200%20400%20368'%3E%3Crect%20width='400'%20height='368'%20fill='%23eee'/%3E%3Ctext%20x='200'%20y='184'%20font-size='20'%20text-anchor='middle'%20fill='%23000'%3EPlace%20Value%20Blocks%3C/text%3E%3C/svg%3E" 
                 alt="A diagram representing place-value blocks."/>
        </div>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>752</mn>
                <mo>+</mo>
                <mn>138</mn>
                <mo>=</mo>
            </math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The sum of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>752</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>138</mn></math> is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>890</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Add each place value carefully so that <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>752</mn><mo>+</mo><mn>138</mn><mo>=</mo><mn>890</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x12a5fa3516445b57_0002
**Title:** Mixed Coin Total Calculation - Variation 2  
**Khan Exercise:** Count money (U.S.)  
**Khan Slug:** counting-money--us-  

**Issues Identified:**
- oversimplified svg as well, again, we should be using the khan coin images

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x12a5fa3516445b57_0002"
    title="Mixed Coin Total Calculation - Variation 2"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>62</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='100'%20viewBox='0%200%20400%20100'%3E%3Crect%20x='0'%20y='0'%20width='400'%20height='100'%20fill='white'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='200'%20y='55'%20font-size='16'%20text-anchor='middle'%3E1%20quarter,%203%20dimes,%201%20nickel,%202%20pennies%3C/text%3E%3C/svg%3E"
                 alt="A depiction of coins: 1 quarter, 3 dimes, 1 nickel, and 2 pennies" width="400" height="100"/>
            <p><span class="qti-italic">Note: The illustration shows 1 quarter, 3 dimes, 1 nickel, and 2 pennies.</span></p>
        </div>
        
        <p><strong>What is the total value of the coins below?</strong></p>

        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/> cents
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> One quarter (25¢) plus 3 dimes (30¢) plus 1 nickel (5¢) plus 2 pennies (2¢) equals 62¢.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Be sure to add: quarter = 25¢, dime = 10¢ each, nickel = 5¢, and penny = 1¢.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x30914dd5209d8ee4_0001
**Title:** Strategies for Adding 63 and 27  
**Khan Exercise:** Select strategies for adding within 100  
**Khan Slug:** select-strategies-for-adding-within-100  

**Issues Identified:**
- both answer choices in this multiple select are correct we should have 4 options

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x30914dd5209d8ee4_0001"
    title="Strategies for Adding 63 and 27"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="2">
            <qti-prompt>Select any strategy that can be used to add <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>63</mn><mo>+</mo><mn>27</mn></mrow></math>.</qti-prompt>
            <qti-simple-choice identifier="A">
                Add <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>63</mn><mo>+</mo><mn>30</mn></mrow></math> then subtract <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math>.
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! Since 30 minus 3 equals 27, this strategy works.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                Add <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>63</mn><mo>+</mo><mn>20</mn></mrow></math> then add <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math>.
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Correct! 20 plus 7 equals 27, so this is a valid strategy.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Great job!</span> Both strategies correctly add 63 and 27.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Ensure that the adjustments you make still sum to 27.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xcc647c4e88872a57_0001
**Title:** Subtract on a Number Line - Variation 1  
**Khan Exercise:** Subtract within 100 using a number line  
**Khan Slug:** subtract-within-100-level-2  

**Issues Identified:**
- oversimplified svg, svg doesn't render we should correctly be using number lines, however some generated questions did this correctly, we need to maintain consistency

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_xcc647c4e88872a57_0001" title="Subtract on a Number Line - Variation 1" time-dependent="false" xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>44</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p>Subtract.</p>
        <p><span class="qti-italic">Use the number line to help you subtract <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>73</mn><mo>-</mo><mn>29</mn></math>.</span></p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns%3D%27http://www.w3.org/2000/svg%27%20width%3D%27400%27%20height%3D%27120%27%3E%3Cdefs%3E%3Cstyle%3E.num%7Bfont-family%3Asans-serif%3Bfont-size%3A12px%3Btext-anchor%3Amiddle%7D.label%7Bfont-family%3Asans-serif%3Bfont-size%3A14px%3Btext-anchor%3Amiddle%3Bfill%3A%234285F4%7D.arr%7Bfill%3Anone%3Bstroke%3A%234285F4%3Bstroke-width%3A2%3Bmarker-end%3Aurl(%23arrowhead)%7D%3C/style%3E%3C/defs%3E%3Cline%20x1%3D%2720%27%20y1%3D%2760%27%20x2%3D%27380%27%20y2%3D%2760%27%20stroke%3D%27%23333%27%20stroke-width%3D%272%27/%3E%3Cline%20x1%3D%2720%27%20y1%3D%2775%27%20x2%3D%2720%27%20y2%3D%2785%27%20stroke%3D%27%23333%27%20stroke-width%3D%271%27/%3E%3Ctext%20class%3D%27num%27%20x%3D%2720%27%20y%3D%2780%27%3E29%3C/text%3E%3Cline%20x1%3D%27380%27%20y1%3D%2775%27%20x2%3D%27380%27%20y2%3D%2785%27%20stroke%3D%27%23333%27%20stroke-width%3D%271%27/%3E%3Ctext%20class%3D%27num%27%20x%3D%27380%27%20y%3D%2780%27%3E73%3C/text%3E%3Cpath%20class%3D%27arr%27%20d%3D%27M%2073%2075%20Q%2070%2055%2053%2075%27/%3E%3Ctext%20class%3D%27label%27%20x%3D%2760%27%20y%3D%2750%27%3E-20%3C/text%3E%3Cpath%20class%3D%27arr%27%20d%3D%27M%2053%2075%20Q%2045%2065%2044%2075%27/%3E%3Ctext%20class%3D%27label%27%20x%3D%2240%27%20y%3D%2740%27%3E-9%3C/text%3E%3C/svg%3E" alt="A number line with labels 29 and 73 and two curved arrows indicating jumps of -20 and -9." width="400" height="120"/>
        </div>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>73</mn><mo>-</mo><mn>29</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> 73 - 29 = 44.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember to subtract by moving left on the number line: from 73 down to 29 gives 44.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xcb1b361c5ff0e5b2_0003
**Title:** Ava's Pencil Box  
**Khan Exercise:** Array word problems  
**Khan Slug:** array-word-problems  

**Issues Identified:**
- terribly created svg should use pencil and fix the sixes and what not

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xcb1b361c5ff0e5b2_0003"
    title="Ava's Pencil Box"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Ava is organizing her pencils. She arranged them in <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> rows with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn></math> pencil in each row.</p>
        
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which image below shows how Ava arranged her pencils?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='80'%20height='300'%20viewBox='0%200%2080%20300'%3E%3Crect%20x='30'%20y='10'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='30'%20y='70'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='30'%20y='130'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='30'%20y='190'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='30'%20y='250'%20width='20'%20height='60'%20fill='%23000000'/%3E%3C/svg%3E"
                     alt="5 rows of 1 pencil each."/>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='60'%20height='240'%20viewBox='0%200%2060%20240'%3E%3Crect%20x='20'%20y='20'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='20'%20y='90'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='20'%20y='160'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='20'%20y='230'%20width='20'%20height='60'%20fill='%23000000'/%3E%3C/svg%3E"
                     alt="4 rows of 1 pencil each."/>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='80'%20height='300'%20viewBox='0%200%2080%20300'%3E%3Crect%20x='15'%20y='10'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='45'%20y='10'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='15'%20y='70'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='45'%20y='70'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='15'%20y='130'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='45'%20y='130'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='15'%20y='190'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='45'%20y='190'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='15'%20y='250'%20width='20'%20height='60'%20fill='%23000000'/%3E%3Crect%20x='45'%20y='250'%20width='20'%20height='60'%20fill='%23000000'/%3E%3C/svg%3E"
                     alt="5 rows of 2 pencils each."/>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Ava arranged her pencils in 5 rows with 1 pencil per row.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Look for the image that shows exactly 5 rows with a single pencil in each.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x37d3f4e85055d952_0001
**Title:** Shelter Dog Adoption Bar Graph  
**Khan Exercise:** Make bar graphs  
**Khan Slug:** make-bar-graphs-1  

**Issues Identified:**
- oversimplified svg... x axis overlaps names, and y axis isn't marked with ticks and points, perhaps even a grid or something will help

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x37d3f4e85055d952_0001"
    title="Shelter Dog Adoption Bar Graph"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <table>
                <thead>
                    <tr>
                        <th>Breed</th>
                        <th class="qti-align-center">Number of Dogs</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Labrador</td><td class="qti-align-center">7</td></tr>
                    <tr><td>Beagle</td><td class="qti-align-center">5</td></tr>
                    <tr><td>German Shepherd</td><td class="qti-align-center">12</td></tr>
                    <tr><td>Chihuahua</td><td class="qti-align-center">8</td></tr>
                </tbody>
            </table>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which bar graph correctly represents the number of dogs available for adoption at the shelter?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='300'%20viewBox='0%200%20420%20300'%3E%3Cg%20transform='translate(50,20)'%3E%3Cline%20x1='0'%20y1='0'%20x2='0'%20y2='240'%20stroke='black'%20stroke-width='2'/%3E%3Crect%20class='bar'%20x='25'%20y='100'%20width='50'%20height='140'/%3E%3Crect%20class='bar'%20x='105'%20y='140'%20width='50'%20height='100'/%3E%3Crect%20class='bar'%20x='185'%20y='0'%20width='50'%20height='240'/%3E%3Crect%20class='bar'%20x='265'%20y='80'%20width='50'%20height='160'/%3E%3Ctext%20x='50'%20y='270'%20class='label'%3ELabrador%3C/text%3E%3Ctext%20x='130'%20y='270'%20class='label'%3EBeagle%3C/text%3E%3Ctext%20x='210'%20y='270'%20class='label'%3EGer.%20Shepherd%3C/text%3E%3Ctext%20x='290'%20y='270'%20class='label'%3EChihuahua%3C/text%3E%3C/g%3E%3C/svg%3E" 
                     alt="Bar chart with Labrador 7, Beagle 5, German Shepherd 12, Chihuahua 8"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! This bar graph exactly matches the shelter data.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='300'%20viewBox='0%200%20420%20300'%3E%3Cg%20transform='translate(50,20)'%3E%3Cline%20x1='0'%20y1='0'%20x2='0'%20y2='240'%20stroke='black'%20stroke-width='2'/%3E%3Crect%20class='bar'%20x='25'%20y='140'%20width='50'%20height='100'/%3E%3Crect%20class='bar'%20x='105'%20y='100'%20width='50'%20height='140'/%3E%3Crect%20class='bar'%20x='185'%20y='0'%20width='50'%20height='240'/%3E%3Crect%20class='bar'%20x='265'%20y='80'%20width='50'%20height='160'/%3E%3Ctext%20x='50'%20y='270'%20class='label'%3ELabrador%3C/text%3E%3Ctext%20x='130'%20y='270'%20class='label'%3EBeagle%3C/text%3E%3Ctext%20x='210'%20y='270'%20class='label'%3EGer.%20Shepherd%3C/text%3E%3Ctext%20x='290'%20y='270'%20class='label'%3EChihuahua%3C/text%3E%3C/g%3E%3C/svg%3E" 
                     alt="Bar chart with Labrador and Beagle values swapped"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. The Labrador and Beagle counts are swapped in this graph.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The graph in option A represents 7 Labradors, 5 Beagles, 12 German Shepherds, and 8 Chihuahuas, exactly matching the table.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Check the table values carefully. The correct graph should show the counts as given in the table.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xab9d378a1c2166c5_0005
**Title:** Select the Quadrilaterals  
**Khan Exercise:** Identify shapes  
**Khan Slug:** recognizing-shapes  

**Issues Identified:**
- oversimplified svg, the answer choices are just labels and the ai was too lazy to create the objects.... NEED ATTENTION

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xab9d378a1c2166c5_0005"
    title="Select the Quadrilaterals"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
            <qti-value>C</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true">
            <qti-prompt>Which of the following figures represent quadrilaterals (closed four-sided polygons)?</qti-prompt>
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Ctext%20x='10'%20y='60'%3EDiamond%3C/text%3E%3C/svg%3E" 
                     alt="A diamond (rhombus) shape with 4 sides."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! A diamond is a quadrilateral.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Ctext%20x='10'%20y='60'%3EL-shaped%3C/text%3E%3C/svg%3E" 
                     alt="An L-shaped figure, which is not a closed quadrilateral."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not correct. An L-shape is not a standard quadrilateral.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Ctext%20x='10'%20y='60'%3ETrapezium%3C/text%3E%3C/svg%3E" 
                     alt="A trapezium with 4 sides."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Correct! A trapezium is a quadrilateral.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="D">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='120'%3E%3Ctext%20x='10'%20y='60'%3ECrescent%20Shape%3C/text%3E%3C/svg%3E" 
                     alt="A crescent-shaped figure, not a closed quadrilateral."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="D">Not quite. A crescent is not a quadrilateral.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The diamond and trapezium are closed four-sided figures.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> A quadrilateral must be a closed polygon with exactly four straight sides.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xf9fdeed92bdb79cc_0002
**Title:** Students' Favorite Sports  
**Khan Exercise:** Solve problems with bar graphs  
**Khan Slug:** solving-problems-with-bar-graphs-2  

**Issues Identified:**
- oversimplified svg, this is TERRIBLE

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xf9fdeed92bdb79cc_0002"
    title="Students' Favorite Sports"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>24</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%20viewBox='0%200%20400%20300'%3E%3Crect%20x='50'%20y='50'%20width='40'%20height='150'%20fill='%234285F4'/%3E%3Ctext%20x='70'%20y='215'%20font-size='12'%20text-anchor='middle'%3E15%3C/text%3E%3Crect%20x='150'%20y='30'%20width='40'%20height='170'%20fill='%234285F4'/%3E%3Ctext%20x='170'%20y='215'%20font-size='12'%20text-anchor='middle'%3E18%3C/text%3E%3Crect%20x='250'%20y='90'%20width='40'%20height='110'%20fill='%234285F4'/%3E%3Ctext%20x='270'%20y='215'%20font-size='12'%20text-anchor='middle'%3E11%3C/text%3E%3Crect%20x='350'%20y='130'%20width='40'%20height='90'%20fill='%234285F4'/%3E%3Ctext%20x='370'%20y='215'%20font-size='12'%20text-anchor='middle'%3E9%3C/text%3E%3C/svg%3E"
                 alt="A bar graph showing students' favorite sports: Basketball = 15, Soccer = 18, Tennis = 11, Swimming = 9." 
                 width="400" height="300"/>
        </div>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/> students
        </p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Basketball and Swimming received 15 and 9 votes respectively, and 15 + 9 = 24.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Add the votes for Basketball (15) and Swimming (9) to obtain 24.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x8f8a5541e995fd9e_0003
**Title:** Measure a door in coins and feet  
**Khan Exercise:** Measure length in different units  
**Khan Slug:** measuring-length-in-different-units  

**Issues Identified:**
- terribly constructed question svg are oversimplified and its shitty this isn't ready for students

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x8f8a5541e995fd9e_0003"
    title="Measure a door in coins and feet"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE_CLIPS" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>15</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="RESPONSE_CM" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>10</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>The length of a door is measured in coins and in feet.</p>

        <div id="reference_text_clips">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='135' viewBox='0 0 320 135'%3E%3Ctext x='160' y='70' font-size='35' text-anchor='middle'%3E🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙🪙%3C/text%3E%3C/svg%3E" 
                 alt="A door measured by 15 coins in a row." width="320" height="135"/>
            <p><span class="qti-italic">Note: The door extends exactly the length of 15 coins.</span></p>
        </div>
        
        <p>The door is <qti-text-entry-interaction response-identifier="RESPONSE_CLIPS" expected-length="3"/> coins long.</p>
        
        <div id="reference_text_cm">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='135' viewBox='0 0 320 135'%3E%3Crect x='10' y='60' width='300' height='10' fill='black'/%3E%3Ctext x='10' y='55' font-size='20'%3E0 ft%3C/text%3E%3Ctext x='280' y='55' font-size='20'%3E10 ft%3C/text%3E%3C/svg%3E" 
                 alt="A ruler marked from 0 ft to 10 ft." width="320" height="135"/>
            <p><span class="qti-italic">Note: On the ruler, the door starts at 0 ft and stretches to 10 ft.</span></p>
        </div>
        
        <p>The door is <qti-text-entry-interaction response-identifier="RESPONSE_CM" expected-length="2"/> feet long.</p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The door measures 15 coins, which equals 10 feet.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Verify the coin count (15) and the ruler from 0 ft to 10 ft.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_CLIPS"/>
                        <qti-correct identifier="RESPONSE_CLIPS"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_CM"/>
                        <qti-correct identifier="RESPONSE_CM"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>

```

---

#### nice_xbf4db36c38e7515a_0003
**Title:** Table Top Measurement Using Toy Cars and Inches  
**Khan Exercise:** Measure length in different units  
**Khan Slug:** measuring-length-in-different-units  

**Issues Identified:**
- terribly constructed question svg are oversimplified and its shitty this isn't ready for students

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xbf4db36c38e7515a_0003"
    title="Table Top Measurement Using Toy Cars and Inches"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE_PAPER" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>12</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-response-declaration identifier="RESPONSE_CM" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>9</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>A rectangular table top is measured using two methods: by lining up toy cars and by using a ruler marked in inches.</p>
        <div id="reference_text">
            
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='320'%20height='115'%20viewBox='0%200%20320%20115'%3E%3Ctext%20x='160'%20y='60'%20font-size='40'%20text-anchor='middle'%3E%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%F0%9F%9A%97%3C/text%3E%3C/svg%3E" 
                 alt="A row of 12 toy cars."/>
        </div>
        <p>The table top is <qti-text-entry-interaction response-identifier="RESPONSE_PAPER" expected-length="2"/> toy cars long.</p>

        <div>
            
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='320'%20height='115'%20viewBox='0%200%20320%20115'%3E%3Cline%20x1='0'%20y1='57'%20x2='320'%20y2='57'%20stroke='%23000'%20stroke-width='2'/%3E%3Ctext%20x='0'%20y='80'%20font-size='20'%3E0%20in%3C/text%3E%3Ctext%20x='320'%20y='80'%20font-size='20'%20text-anchor='end'%3E9%20in%3C/text%3E%3C/svg%3E" 
                 alt="A ruler showing 0 in to 9 in."/>
        </div>
        <p>The table top is also <qti-text-entry-interaction response-identifier="RESPONSE_CM" expected-length="2"/> inches long.</p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The table top measures 12 toy cars, which equals 9 inches on the ruler.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Verify the number of toy cars and check the ruler to confirm the measurements.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_PAPER"/>
                        <qti-correct identifier="RESPONSE_PAPER"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_CM"/>
                        <qti-correct identifier="RESPONSE_CM"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

### HIGH Priority Issues

#### nice_xce418da045da08ea_0001
**Title:** Total Kittens Eating Treats  
**Khan Exercise:** Solve problems with picture graphs  
**Khan Slug:** solving-problems-with-picture-graphs-1  

**Issues Identified:**
- emojis get cut off

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xce418da045da08ea_0001"
    title="Total Kittens Eating Treats"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>14</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>The Kitty Club is serving treats at lunch. Each kitten gets one treat.</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='260'%20height='40'%3E%3Cdefs%3E%3Cstyle%3E.label%7Bfont-family:sans-serif;font-size:16px;%7D%3C/style%3E%3C/defs%3E%3Ctext%20class='label'%20x='10'%20y='25'%3EKey:%20one%20%F0%9F%98%BA%20=%201%20kitten%3C/text%3E%3C/svg%3E" alt="Key: one kitten emoji equals one kitten." width="260" height="40"/>
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='520'%20height='200'%3E%3Cdefs%3E%3Cstyle%3E.emoji%7Bfont-size:28px;text-anchor:middle;%7D%3C/style%3E%3C/defs%3E
            %3Ctext%20class='emoji'%20x='50'%20y='40'%3E%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%3C/text%3E
            %3Ctext%20class='emoji'%20x='50'%20y='90'%3E%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%3C/text%3E
            %3Ctext%20class='emoji'%20x='50'%20y='140'%3E%F0%9F%98%BA%20%F0%9F%98%BA%3C/text%3E
            %3Ctext%20class='emoji'%20x='50'%20y='190'%3E%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%20%F0%9F%98%BA%3C/text%3E
            %3C/svg%3E" alt="Pictograph: Row 1 with 3 kittens; Row 2 with 4 kittens; Row 3 with 2 kittens; Row 4 with 5 kittens." width="520" height="200"/>
        </div>
        <p>How many total kittens received treats?</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
            kittens
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Adding the treats from each row: 3 + 4 + 2 + 5 = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>14</mn></math> kittens.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Count the kitten icons in each row and add them: 3 + 4 + 2 + 5.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_xf48d1d021b7d0767_0001
**Title:** Identify Dime Value  
**Khan Exercise:** Identify the value of US coins and dollars  
**Khan Slug:** identify-the-value-of-different-forms-of-money-us  

**Issues Identified:**
- not bad but prefer to use khan coin image

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xf48d1d021b7d0767_0001"
    title="Identify Dime Value"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='80'%20height='80'%20viewBox='0%200%2080%2080'%3E%3Ccircle%20cx='40'%20cy='40'%20r='38'%20fill='%23E0E0E0'%20stroke='%23000'%20stroke-width='2'/%3E%3Ctext%20x='40'%20y='45'%20font-size='16'%20text-anchor='middle'%20fill='%23000'%3EDime%3C/text%3E%3C/svg%3E"
                 alt="An image of a Dime coin." width="80" height="80"/>
        </div>

        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="1">
            <qti-prompt>What is the value of this coin?</qti-prompt>
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>¢</mo></math>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>¢</mo></math>
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>¢</mo></math>
            </qti-simple-choice>
            <qti-simple-choice identifier="D">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>25</mn><mo>¢</mo></math>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> This coin is worth <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>¢</mo></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> The coin shown is a Dime, which is worth <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>¢</mo></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x503aedf7937758eb_0003
**Title:** Estimate Mom's Height  
**Khan Exercise:** Estimate lengths  
**Khan Slug:** estimating-lengths  

**Issues Identified:**
- image doesn't render either using placeholder image or non renderable simplified svg

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x503aedf7937758eb_0003"
    title="Estimate Mom's Height"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Ella is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>35</mn></math> centimeters tall.</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='200'%20viewBox='0%200%20400%20200'%3E%3Crect%20width='400'%20height='200'%20fill='none'%20stroke='%23000'%20stroke-width='2'/%3E%3Ctext%20x='200'%20y='100'%20font-size='20'%20text-anchor='middle'%3EElla%20%26%20Mom%3A%2035/50%3C/text%3E%3C/svg%3E"
                 alt="Diagram showing Ella and her mom, with Ella's height 35 cm and mom's estimated height 50 cm."/>
            <p><span class="qti-italic">Note: The diagram indicates Ella is 35 cm tall and her mom appears considerably taller.</span></p>
        </div>
        
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="1">
            <qti-prompt>About how tall is Ella's mom?</qti-prompt>
            <qti-simple-choice identifier="A">50 centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! Ella's mom is estimated to be 50 cm tall.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">45 centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. While close, the diagram suggests a slightly taller height.</qti-feedback-inline>
            </qti-simple-choice>
            <qti-simple-choice identifier="C">60 centimeters
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. 60 cm appears too high based on the illustration.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Based on the illustration, Ella's mom is about 50 cm tall.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Ella is 35 cm tall, so her mom should be appreciably taller; 50 cm is the best estimate here.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xa67fea6e7226c92b_0003
**Title:** Line Plot of Marker Lengths - Variation 3  
**Khan Exercise:** Make line plots  
**Khan Slug:** creating-line-plots-1  

**Issues Identified:**
- number line gets cut off when rendered needs to be fixed

**Additional SVG Analysis:**
- SVG missing viewBox attribute for responsive scaling
- SVG missing viewBox attribute for responsive scaling
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="nice_xa67fea6e7226c92b_0003" title="Line Plot of Marker Lengths - Variation 3" time-dependent="false" xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <p>Four markers have been measured (in millimeters): one marker is 125 mm, one is 100 mm, and two are 75 mm long.</p>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which line plot correctly shows these four marker lengths?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='150'%3E%3Cdefs%3E%3Cstyle%3E.txt%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.ln%7Bstroke:%23000;stroke-width:2%7D.tk%7Bstroke:%23000;stroke-width:1%7D.dot%7Bfill:%234285F4%7D%3C/style%3E%3C/defs%3E%3Cline%20class='ln'%20x1='60'%20y1='120'%20x2='300'%20y2='120'/%3E%3Cg%20class='tk'%3E%3Cpath%20d='M60,115%20v10%20M100,115%20v10%20M140,115%20v10%20M180,115%20v10%20M220,115%20v10%20M260,115%20v10%20M300,115%20v10'/%3E%3C/g%3E%3Cg%20class='txt'%3E%3Ctext%20x='60'%20y='140'%3E0%3C/text%3E%3Ctext%20x='100'%20y='140'%3E25%3C/text%3E%3Ctext%20x='140'%20y='140'%3E50%3C/text%3E%3Ctext%20x='180'%20y='140'%3E75%3C/text%3E%3Ctext%20x='220'%20y='140'%3E100%3C/text%3E%3Ctext%20x='260'%20y='140'%3E125%3C/text%3E%3Ctext%20x='300'%20y='140'%3E150%3C/text%3E%3C/g%3E%3C!-- Dots: two at 75 (x=180), one at 100 (x=220), one at 125 (x=260) --%3E%3Ccircle%20class='dot'%20cx='180'%20cy='90'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='180'%20cy='110'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='220'%20cy='100'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='260'%20cy='100'%20r='6'/%3E%3C/svg%3E" alt="Line plot showing two markers at 75 mm, one at 100 mm, and one at 125 mm."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! The plot correctly shows two markers at 75 mm, one at 100 mm, and one at 125 mm.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='150'%3E%3Cdefs%3E%3Cstyle%3E.txt%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.ln%7Bstroke:%23000;stroke-width:2%7D.tk%7Bstroke:%23000;stroke-width:1%7D.dot%7Bfill:%234285F4%7D%3C/style%3E%3C/defs%3E%3Cline%20class='ln'%20x1='60'%20y1='120'%20x2='300'%20y2='120'/%3E%3Cg%20class='tk'%3E%3Cpath%20d='M60,115%20v10%20M100,115%20v10%20M140,115%20v10%20M180,115%20v10%20M220,115%20v10%20M260,115%20v10%20M300,115%20v10'/%3E%3C/g%3E%3Cg%20class='txt'%3E%3Ctext%20x='60'%20y='140'%3E0%3C/text%3E%3Ctext%20x='100'%20y='140'%3E25%3C/text%3E%3Ctext%20x='140'%20y='140'%3E50%3C/text%3E%3Ctext%20x='180'%20y='140'%3E75%3C/text%3E%3Ctext%20x='220'%20y='140'%3E100%3C/text%3E%3Ctext%20x='260'%20y='140'%3E125%3C/text%3E%3Ctext%20x='300'%20y='140'%3E150%3C/text%3E%3C/g%3E%3C!-- Dots: one at 75, one at 75 (mistakenly only one dot), one at 100, one at 125, and an extra dot at 100 --%3E%3Ccircle%20class='dot'%20cx='180'%20cy='100'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='220'%20cy='100'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='220'%20cy='80'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='260'%20cy='100'%20r='6'/%3E%3C/svg%3E" alt="Line plot showing one marker at 75 mm, two at 100 mm, and one at 125 mm."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. This plot shows markers with the wrong grouping; there should be two at 75 mm, not two at 100 mm.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='150'%3E%3Cdefs%3E%3Cstyle%3E.txt%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.ln%7Bstroke:%23000;stroke-width:2%7D.tk%7Bstroke:%23000;stroke-width:1%7D.dot%7Bfill:%234285F4%7D%3C/style%3E%3C/defs%3E%3Cline%20class='ln'%20x1='60'%20y1='120'%20x2='300'%20y2='120'/%3E%3Cg%20class='tk'%3E%3Cpath%20d='M60,115%20v10%20M100,115%20v10%20M140,115%20v10%20M180,115%20v10%20M220,115%20v10%20M260,115%20v10%20M300,115%20v10'/%3E%3C/g%3E%3Cg%20class='txt'%3E%3Ctext%20x='60'%20y='140'%3E0%3C/text%3E%3Ctext%20x='100'%20y='140'%3E25%3C/text%3E%3Ctext%20x='140'%20y='140'%3E50%3C/text%3E%3Ctext%20x='180'%20y='140'%3E75%3C/text%3E%3Ctext%20x='220'%20y='140'%3E100%3C/text%3E%3Ctext%20x='260'%20y='140'%3E125%3C/text%3E%3Ctext%20x='300'%20y='140'%3E150%3C/text%3E%3C/g%3E%3C!-- Dots: two at 75, one at 100, and one at 150 (should be 125) --%3E%3Ccircle%20class='dot'%20cx='180'%20cy='90'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='180'%20cy='110'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='220'%20cy='100'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='300'%20cy='100'%20r='6'/%3E%3C/svg%3E" alt="Line plot showing two markers at 75 mm, one at 100 mm, and one at 150 mm."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. This plot incorrectly shows the last marker as 150 mm instead of 125 mm.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The correct plot shows two markers at 75 mm, one at 100 mm, and one at 125 mm.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Check the grouping and ensure the markers measure 75, 75, 100, and 125 mm respectively.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>

```

---

#### nice_x8596dbd12ec9a8a1_0001
**Title:** Interpreting a Line Plot of Plant Heights  
**Khan Exercise:** Solve problems with line plots  
**Khan Slug:** solving-problems-with-line-plots-1  

**Issues Identified:**
- dots plot isn't rendered

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_x8596dbd12ec9a8a1_0001" title="Interpreting a Line Plot of Plant Heights" time-dependent="false" xml:lang="en-US">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
    <qti-correct-response>
      <qti-value>6</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
  <qti-item-body>
    <p>The following line plot shows the heights of various plants measured in centimeters.</p>
    <div id="reference_text">
      <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='350'%20height='200'%20viewBox='0%200%20350%20200'%3E%3Cdefs%3E%3Cstyle%3E.txt%20%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.ln%20%7Bstroke:%23000;stroke-width:2%7D.tick%20%7Bstroke:%23000;stroke-width:1%7D.dot%20%7Bfill:%234285F4%7D%3C/style%3E%3C/defs%3E%3Cg%20transform='translate(20,20)'%3E%3Ctext%20class='ax-label'%20x='175'%20y='170'%3EPlant%20Height%20(cm)%3C/text%3E%3Cline%20class='ln'%20x1='10'%20y1='130'%20x2='330'%20y2='130'/%3E%3Cg%20class='tick'%3E%3Cline%20x1='50'%20y1='125'%20x2='50'%20y2='135'/%3E%3Cline%20x1='110'%20y1='125'%20x2='110'%20y2='135'/%3E%3Cline%20x1='170'%20y1='125'%20x2='170'%20y2='135'/%3E%3Cline%20x1='230'%20y1='125'%20x2='230'%20y2='135'/%3E%3Cline%20x1='290'%20y1='125'%20x2='290'%20y2='135'/%3E%3C/g%3E%3Cg%20class='txt'%3E%3Ctext%20x='50'%20y='150'%3E30%3C/text%3E%3Ctext%20x='110'%20y='150'%3E35%3C/text%3E%3Ctext%20x='170'%20y='150'%3E40%3C/text%3E%3Ctext%20x='230'%20y='150'%3E45%3C/text%3E%3Ctext%20x='290'%20y='150'%3E50%3C/text%3E%3C/g%3E%3Ccircle%20class='dot'%20cx='50'%20cy='110'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='110'%20cy='115'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='110'%20cy='100'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='110'%20cy='85'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='170'%20cy='120'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='170'%20cy='105'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='170'%20cy='90'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='170'%20cy='75'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='230'%20cy='110'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='230'%20cy='90'%20r='6'/%3E%3C/svg%3E" alt="A line plot showing plant heights: 1 dot at 30 cm; 3 dots at 35 cm; 4 dots at 40 cm; and 2 dots at 45 cm." width="350" height="200"/>
      <p><span class="qti-italic">Note: The plot has 1 plant at 30 cm, 3 plants at 35 cm, 4 plants at 40 cm, and 2 plants at 45 cm. (The scale is marked at 30, 35, 40, 45, and 50 cm.)</span></p>
    </div>
    <p>How many plants are taller than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>35</mn></math> centimeters?</p>
    <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/> plants</p>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Correct!</span> Only plants taller than 35 cm are counted. In this plot, the plants at 40 cm (4 plants) and 45 cm (2 plants) total <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn></math>.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Not quite.</span> Count only the plants that are taller than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>35</mn></math> cm. Here, only the heights at 40 cm and 45 cm are above 35, which add up to 6.</p>
      </qti-content-body>
    </qti-feedback-block>
  </qti-item-body>
  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match>
          <qti-variable identifier="RESPONSE"/>
          <qti-correct identifier="RESPONSE"/>
        </qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">CORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_x4d4c4f5c1e0e9fc2_0004
**Title:** Choose the correct number line for 489 + 367  
**Khan Exercise:** Add on a number line  
**Khan Slug:** adding-and-subtracting-within-1000-using-a-number-line  

**Issues Identified:**
- number lines don't render

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x4d4c4f5c1e0e9fc2_0004"
    title="Choose the correct number line for 489 + 367"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which number line shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>489</mn><mo>+</mo><mn>367</mn></math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- Correct: Jumps of +1, +80, and +286 (1+80+286=367) --%3E%3C/svg%3E"
                     alt="Number line with jumps: +1 from 489 to 490, then +80 to 570, and +286 to 856."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! 489+1=490; 490+80=570; 570+286=856.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- Distractor: Jumps of +1, +80, and +288 (sum=1+80+288=369) --%3E%3C/svg%3E"
                     alt="Number line with jumps: +1, +80, and +288, which sum to 369 instead of 367."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. The final jump is too high, adding up to 369 instead of 367.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- Distractor: Jumps of +5, +80, and +280 (sum=5+80+280=365) --%3E%3C/svg%3E"
                     alt="Number line with jumps: +5, +80, and +280, totaling 365, which is incorrect."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. This breakdown sums to 365 rather than 367.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> 489 + 367 equals 856 with the breakdown of 1, 80, and 286.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Check your parts; they must add up exactly to 367.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>

```

---

#### nice_x4d4c4f5c1e0e9fc2_0001
**Title:** Choose the correct number line for 643 + 278  
**Khan Exercise:** Add on a number line  
**Khan Slug:** adding-and-subtracting-within-1000-using-a-number-line  

**Issues Identified:**
- number lines don't render

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling
- SVG contains only text without proper graphical elements
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x4d4c4f5c1e0e9fc2_0001"
    title="Choose the correct number line for 643 + 278"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which number line shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>643</mn><mo>+</mo><mn>278</mn></math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- This number line represents jumps of +7, +70, and +201 --%3E%3C!-- Starting at 643: 643+7=650, 650+70=720, 720+201=921 --%3E%3C/svg%3E"
                     alt="Number line with jumps: +7 from 643 to 650, then +70 to 720, and +201 to 921."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! Breaking 278 into 7, 70, and 201, we have 643+7=650, 650+70=720, and 720+201=921.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- This number line represents jumps of +7, +70, and +203 --%3E%3C/svg%3E"
                     alt="Number line with jumps: +7, +70, and +203, which sums to 280 instead of 278."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. The last jump adds 203, making the total addition 7+70+203=280, which is incorrect.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='120'%3E%3Cdefs%3E%3Cstyle%3E.base%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.txt%7Bfont-size:12px;text-anchor:middle%7D.arr%7Bstroke:%234285F4;stroke-width:2%7D.lbl%7Bfont-size:13px;fill:%234285F4;text-anchor:middle%7D%3C/style%3E%3C/defs%3E%3C!-- This number line represents jumps of +10, +60, and +200 --%3E%3C/svg%3E"
                     alt="Number line with jumps: +10, +60, and +200, ending at 643+270=913, which is too low."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. The jumps here add up to 10+60+200=270; starting at 643, that gives 913, not the correct sum.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> 643 + 278 equals 921 when 278 is split into 7, 70, and 201.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Break 278 into parts that add exactly to 278 and then add them sequentially to 643.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>

```

---

#### nice_x44dc31eced947662_0004
**Title:** Place Value Composition Variation 4  
**Khan Exercise:** Hundreds, tens, and ones  
**Khan Slug:** hundreds--tens--and-ones  

**Issues Identified:**
- rendering is off there's no spaces for the number and the words

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x44dc31eced947662_0004"
    title="Place Value Composition Variation 4"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>1030</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>
            What number represents the same amount as
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>9</mn><mtext> hundreds</mtext>
                <mo>+</mo>
                <mn>5</mn><mtext> tens</mtext>
                <mo>+</mo>
                <mn>80</mn><mtext> ones</mtext>
            </math>?
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="4"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> 9 hundreds plus 5 tens plus 80 ones equals 1030 because 80 ones regroup to 8 tens, and 5+8 equals 13 tens, which makes an extra hundred.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember that 80 ones can be regrouped as 8 tens. Adding these 8 tens to the existing 5 tens gives 13 tens, which is the same as 1 hundred and 3 tens. Then, 9 hundreds plus 1 hundred is 10 hundreds; with 3 tens, the total is 1030.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

### MEDIUM Priority Issues

#### nice_x0d376da99032c56d_0005
**Title:** Subtract two-digit numbers: Variant 5  
**Khan Exercise:** Subtract within 100 using place value blocks  
**Khan Slug:** subtraction_3  

**Issues Identified:**

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x0d376da99032c56d_0005"
    title="Subtract two-digit numbers: Variant 5"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>36</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Subtract. <span class="qti-italic">Hint: Use the place-value blocks to help solve <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>-</mo><mn>19</mn></math>.</span></p>

        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='310'%20height='120'%20viewBox='0%200%20310%20120'%3E%3Crect%20x='0'%20y='0'%20width='310'%20height='120'%20fill='white'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='155'%20y='60'%20font-size='20'%20text-anchor='middle'%3EPlace-value%20blocks:%2055%20and%2019%3C/text%3E%3C/svg%3E" 
                 alt="Place-value blocks representing 55 and 19." width="310" height="120"/>
        </div>
        
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>-</mo><mn>19</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>55</mn><mo>-</mo><mn>19</mn><mo>=</mo><mn>36</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Subtract the ones: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>-</mo><mn>9</mn><mo>=</mo><mn>6</mn></math> (after borrowing), and the tens: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>50</mn><mo>-</mo><mn>10</mn><mo>=</mo><mn>40</mn></math> adjusted for the borrow gives <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>36</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x8465fc2816739d9e_0005
**Title:** Subtract using place value blocks: 150 - 97  
**Khan Exercise:** Subtract within 100 using place value blocks  
**Khan Slug:** subtraction_3  

**Issues Identified:**

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x8465fc2816739d9e_0005"
    title="Subtract using place value blocks: 150 - 97"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>53</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='120'%20viewBox='0%200%20400%20120'%3E%3Ctext%20x='10'%20y='60'%3EPlace%20value%20blocks%20for%20150%20and%2097%3C/text%3E%3C/svg%3E" 
                 alt="Place value blocks representing 150 and 97."/>
            <p><span class="qti-italic">Hint: Use the blocks to represent the subtraction 150 - 97.</span></p>
        </div>
        
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>150</mn><mo>-</mo><mn>97</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>150</mn><mo>-</mo><mn>97</mn><mo>=</mo><mn>53</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Subtract the tens and ones carefully to find that 150 minus 97 equals 53.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x2c972751edc28018_0005
**Title:** Read Time on a Number Line  
**Khan Exercise:** Telling time on a number line  
**Khan Slug:** telling_time  

**Issues Identified:**

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x2c972751edc28018_0005"
    title="Read Time on a Number Line"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE_HR" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>11</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="RESPONSE_MIN" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>55</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Look at the following number line.</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='700'%20height='100'%20viewBox='0%200%20700%20100'%3E%3Cline%20x1='50'%20y1='50'%20x2='650'%20y2='50'%20stroke='black'%20stroke-width='2'%3E%3C/line%3E%3Ctext%20x='50'%20y='30'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3E11:30%3C/text%3E%3Ctext%20x='190'%20y='30'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3E11:45%3C/text%3E%3Ctext%20x='330'%20y='30'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3E12:00%3C/text%3E%3Ctext%20x='470'%20y='30'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3E12:15%3C/text%3E%3Ctext%20x='610'%20y='30'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3E12:30%3C/text%3E%3Cline%20x1='283'%20y1='35'%20x2='283'%20y2='65'%20stroke='%23A0522D'%20stroke-width='4'%3E%3C/line%3E%3Ctext%20x='283'%20y='90'%20font-family='serif'%20font-size='24'%20text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E"
                 alt="Number line showing times from 11:30 to 12:30 with a marker at the time point."/>
        </div>
        <p>What time is shown on the number line?</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE_HR" expected-length="2"/> : <qti-text-entry-interaction response-identifier="RESPONSE_MIN" expected-length="2"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The marker indicates the time 11:55.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Notice the marker is positioned between 11:45 and 12:00, which corresponds to 11:55.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_HR"/>
                        <qti-correct identifier="RESPONSE_HR"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_MIN"/>
                        <qti-correct identifier="RESPONSE_MIN"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_xefa47b08aaf68194_0004
**Title:** Add 82 and 17  
**Khan Exercise:** Add within 100 using place value blocks  
**Khan Slug:** addition_3  

**Issues Identified:**

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xefa47b08aaf68194_0004"
    title="Add 82 and 17"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>99</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p>Add.</p>
        <p><span class="qti-italic">Hint: Use the place value blocks to help solve <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>82</mn><mo>+</mo><mn>17</mn></math>.</span></p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='265'%20height='120'%20viewBox='0%200%20265%20120'%3E%3Crect%20x='0'%20y='0'%20width='265'%20height='120'%20fill='lightgrey'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='10'%20y='40'%20font-size='16'%20fill='black'%3EFirst%20number:%2082%3C/text%3E%3Ctext%20x='10'%20y='80'%20font-size='16'%20fill='black'%3ESecond%20number:%2017%3C/text%3E%3C/svg%3E"
                 alt="Place value blocks showing 82 (8 tens and 2 ones) and 17 (1 ten and 7 ones)."/>
            <p><span class="qti-italic">Note: The first number is 82 (8 tens, 2 ones) and the second is 17 (1 ten, 7 ones).</span></p>
        </div>
        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>82</mn><mo>+</mo><mn>17</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>82</mn><mo>+</mo><mn>17</mn><mo>=</mo><mn>99</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Add the tens (8 + 1 = 9) and the ones (2 + 7 = 9). Thus, 82 + 17 equals 99.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x4ea0de5ec640b7fb_0001
**Title:** Add Two-Digit Numbers: 47 + 35  
**Khan Exercise:** Add within 100 using place value blocks  
**Khan Slug:** addition_3  

**Issues Identified:**

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x4ea0de5ec640b7fb_0001"
    title="Add Two-Digit Numbers: 47 + 35"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>82</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='221'%20height='120'%20viewBox='0%200%20221%20120'%3E%3Ctext%20x='10'%20y='30'%20font-size='14'%3E47%20(4%20tens,%207%20ones)%3C/text%3E%3Ctext%20x='10'%20y='60'%20font-size='14'%3E35%20(3%20tens,%205%20ones)%3C/text%3E%3C/svg%3E"
                 alt="Place value blocks representing 47 and 35"/>
            <p><span class="qti-italic">Note: The illustration shows 47 as 4 tens and 7 ones, and 35 as 3 tens and 5 ones. When you add the ones, 7+5=12, regroup 1 ten, then add the tens: 4+3+1=8 tens, giving 82.</span></p>
        </div>
        
        <p>Add. <span class="qti-italic">Hint: Use the place-value blocks to help solve </span><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>47</mn><mo>+</mo><mn>35</mn></math>.</p>

        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mn>47</mn><mo>+</mo><mn>35</mn><mo>=</mo>
            </math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Adding 47 and 35 gives 82: 7+5=12, write 2 and carry 1; 4+3+1=8.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember to add the ones first (7+5=12) and regroup the extra ten into the tens place, so 47+35 equals 82.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x8953c437b4808dc0_0001
**Title:** What time is it? (Variation 1)  
**Khan Exercise:** Telling time on a clock  
**Khan Slug:** telling_time_0.5  

**Issues Identified:**

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_x8953c437b4808dc0_0001" title="What time is it? (Variation 1)" time-dependent="false" xml:lang="en-US">
    <qti-response-declaration identifier="RESPONSE_HR" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>3</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-response-declaration identifier="RESPONSE_MIN" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>15</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-item-body>
        <p>Examine the analog clock below and determine the time shown.</p>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='225'%20height='225'%20viewBox='0%200%20225%20225'%3E%3Ccircle%20cx='112.5'%20cy='112.5'%20r='100'%20stroke='black'%20fill='none'/%3E%3Cline%20x1='112.5'%20y1='112.5'%20x2='112.5'%20y2='30'%20stroke='black'%20stroke-width='5'%20transform='rotate(97.5%20112.5%20112.5)'/%3E%3Cline%20x1='112.5'%20y1='112.5'%20x2='112.5'%20y2='20'%20stroke='black'%20stroke-width='3'%20transform='rotate(90%20112.5%20112.5)'/%3E%3C/svg%3E" alt="An analog clock with the hour hand slightly past 3 and minute hand pointing at 15 minutes." width="225" height="225"/>
            <p><span class="qti-italic">Note: The shorter (hour) hand is just past the 3, and the longer (minute) hand points toward the 3 on the clock face which represents 15 minutes.</span></p>
        </div>
        <p>What time is it?</p>
        <p>The time is <qti-text-entry-interaction response-identifier="RESPONSE_HR" expected-length="2"/> : <qti-text-entry-interaction response-identifier="RESPONSE_MIN" expected-length="2"/></p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The clock shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>:</mo><mn>15</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Look carefully: the hour hand is just past 3 and the minute hand is at the mark for 15 minutes. Therefore, the time is 3:15.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_HR"/>
                        <qti-correct identifier="RESPONSE_HR"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_MIN"/>
                        <qti-correct identifier="RESPONSE_MIN"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_x49eb373ff4bc6d20_0004
**Title:** Taylor's Coin Sweep  
**Khan Exercise:** Money word problems (U.S.)  
**Khan Slug:** money-word-problems-us  

**Issues Identified:**

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
    identifier="nice_x49eb373ff4bc6d20_0004"
    title="Taylor's Coin Sweep"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='50' viewBox='0 0 320 50'%3E%3Ctext x='10' y='30' font-size='16'%3E2 nickels%20and%203 dimes%20(in%20cushions)%3C/text%3E%3C/svg%3E" alt="2 nickels and 3 dimes in cushions"/>
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='50' viewBox='0 0 320 50'%3E%3Ctext x='10' y='30' font-size='16'%3E1 quarter%2C%201 dime%2C%202 pennies%20(on%20carpet)%3C/text%3E%3C/svg%3E" alt="1 quarter, 1 dime, 2 pennies on carpet"/>
            <p><span class="qti-italic">Note: The first image shows coins from the couch cushions; the second shows coins on the carpet.</span></p>
        </div>

        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Taylor was sweeping his living room. In the couch cushions he found 2 nickels (5¢ each) and 3 dimes (10¢ each), and on the carpet he found 1 quarter (25¢), 1 dime, and 2 pennies. What total value did Taylor find?</qti-prompt>
            <qti-simple-choice identifier="A">77¢</qti-simple-choice>
            <qti-simple-choice identifier="B">72¢</qti-simple-choice>
            <qti-simple-choice identifier="C">87¢</qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The cushions give 2 nickels (10¢) + 3 dimes (30¢) = 40¢; on the carpet, 1 quarter (25¢) + 1 dime (10¢) + 2 pennies (2¢) = 37¢. Total = 40¢ + 37¢ = 77¢.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Add the values from the cushions (10¢+30¢) and the carpet (25¢+10¢+2¢) to get 77¢.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x357acbba4cc9462c_0003
**Title:** Adding pennies on a number line  
**Khan Exercise:** Add and subtract on the number line word problems  
**Khan Slug:** adding-and-subtracting-on-the-number-line-word-problems  

**Issues Identified:**
- good number lines, however the jumps between the points should show + or - the number

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
    identifier="nice_x357acbba4cc9462c_0003"
    title="Adding pennies on a number line"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE_CHOICE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="RESPONSE_NUMERIC" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>120</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>The teacher had <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>40</mn></math> pennies.</p>
        <p>Then, the teacher found <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>25</mn></math> more pennies in her purse, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>35</mn></math> more pennies in a jar, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>20</mn></math> more pennies in her desk.</p>

        <qti-choice-interaction response-identifier="RESPONSE_CHOICE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which number line shows how to calculate the total pennies the teacher has now?</qti-prompt>
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'%3E%3Cline x1='20' y1='70' x2='380' y2='70' stroke='black' stroke-width='2'/%3E%3Cline x1='20' y1='65' x2='20' y2='75' stroke='black'/%3E%3Ctext x='20' y='90' font-size='12' text-anchor='middle'%3E0%3C/text%3E%3Cline x1='150' y1='65' x2='150' y2='75' stroke='black'/%3E%3Ctext x='150' y='90' font-size='12' text-anchor='middle'%3E25%3C/text%3E%3Cline x1='280' y1='65' x2='280' y2='75' stroke='black'/%3E%3Ctext x='280' y='90' font-size='12' text-anchor='middle'%3E60%3C/text%3E%3Cline x1='350' y1='65' x2='350' y2='75' stroke='black'/%3E%3Ctext x='350' y='90' font-size='12' text-anchor='middle'%3E?%3C/text%3E%3Cpath d='M20 65 Q85 15 150 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3Cpath d='M150 65 Q215 15 280 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3Cpath d='M280 65 Q315 35 350 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3C/svg%3E"
                     alt="Number line starting at 0 with jumps of +25, +35, and +20 ending at a question mark."/>
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'%3E%3Cline x1='20' y1='70' x2='380' y2='70' stroke='black' stroke-width='2'/%3E%3Cline x1='20' y1='65' x2='20' y2='75' stroke='black'/%3E%3Ctext x='20' y='90' font-size='12' text-anchor='middle'%3E40%3C/text%3E%3Cline x1='150' y1='65' x2='150' y2='75' stroke='black'/%3E%3Ctext x='150' y='90' font-size='12' text-anchor='middle'%3E65%3C/text%3E%3Cline x1='280' y1='65' x2='280' y2='75' stroke='black'/%3E%3Ctext x='280' y='90' font-size='12' text-anchor='middle'%3E100%3C/text%3E%3Cline x1='350' y1='65' x2='350' y2='75' stroke='black'/%3E%3Ctext x='350' y='90' font-size='12' text-anchor='middle'%3E?%3C/text%3E%3Cpath d='M20 65 Q85 15 150 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3Cpath d='M150 65 Q215 15 280 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3Cpath d='M280 65 Q315 35 350 65' fill='none' stroke='%234285F4' stroke-width='2'/%3E%3C/svg%3E"
                     alt="Number line starting at 40 with jumps of +25, +35, and +20 ending at a question mark."/>
            </qti-simple-choice>
        </qti-choice-interaction>

        <p>How many pennies does the teacher have now?</p>
        <p><qti-text-entry-interaction response-identifier="RESPONSE_NUMERIC" expected-length="3"/> pennies</p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The teacher now has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn></math> pennies.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Starting at <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>40</mn></math> and adding <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>25</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>35</mn></math>, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>20</mn></math> gives <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_CHOICE"/>
                        <qti-correct identifier="RESPONSE_CHOICE"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="RESPONSE_NUMERIC"/>
                        <qti-correct identifier="RESPONSE_NUMERIC"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x82f67f2e8546eed8_0005
**Title:** Select the correct number-line representation  
**Khan Exercise:** Subtract on a number line  
**Khan Slug:** subtract-on-a-number-line  

**Issues Identified:**
- oversimplified number line missing jump indicators

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements
- SVG contains only text without proper graphical elements
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x82f67f2e8546eed8_0005"
    title="Select the correct number-line representation"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which number line shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>879</mn><mo>-</mo><mn>536</mn></math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20width%3D'400'%20height%3D'100'%20viewBox%3D'0%200%20400%20100'%3E%3Cline%20x1%3D'20'%20y1%3D'50'%20x2%3D'380'%20y2%3D'50'%20stroke%3D'black'%20stroke-width%3D'2'/%3E%3Cline%20x1%3D'20'%20y1%3D'45'%20x2%3D'20'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'20'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E879%3C/text%3E%3Cline%20x1%3D'160'%20y1%3D'45'%20x2%3D'160'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'160'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E379%3C/text%3E%3Cline%20x1%3D'300'%20y1%3D'45'%20x2%3D'300'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'300'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E343%3C/text%3E%3C/svg%3E"
                     alt="Number line with markers at 879, 379, and 343"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! 879 minus 536 equals 343.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20width%3D'400'%20height%3D'100'%20viewBox%3D'0%200%20400%20100'%3E%3Cline%20x1%3D'20'%20y1%3D'50'%20x2%3D'380'%20y2%3D'50'%20stroke%3D'black'%20stroke-width%3D'2'/%3E%3Cline%20x1%3D'20'%20y1%3D'45'%20x2%3D'20'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'20'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E879%3C/text%3E%3Cline%20x1%3D'160'%20y1%3D'45'%20x2%3D'160'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'160'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E379%3C/text%3E%3Cline%20x1%3D'300'%20y1%3D'45'%20x2%3D'300'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'300'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E342%3C/text%3E%3C/svg%3E"
                     alt="Number line with markers at 879, 379, and 342"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. 879 minus 536 is not 342.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20width%3D'400'%20height%3D'100'%20viewBox%3D'0%200%20400%20100'%3E%3Cline%20x1%3D'20'%20y1%3D'50'%20x2%3D'380'%20y2%3D'50'%20stroke%3D'black'%20stroke-width%3D'2'/%3E%3Cline%20x1%3D'20'%20y1%3D'45'%20x2%3D'20'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'20'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E879%3C/text%3E%3Cline%20x1%3D'160'%20y1%3D'45'%20x2%3D'160'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'160'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E379%3C/text%3E%3Cline%20x1%3D'300'%20y1%3D'45'%20x2%3D'300'%20y2%3D'55'%20stroke%3D'black'/%3E%3Ctext%20x%3D'300'%20y%3D'80'%20font-size%3D'12'%20text-anchor%3D'middle'%3E344%3C/text%3E%3C/svg%3E"
                     alt="Number line with markers at 879, 379, and 344"/>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. 879 minus 536 is not 344.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> 879 minus 536 equals 343.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Double-check your subtraction; the correct answer is 343.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_x400017b097ce6e49_0004
**Title:** Identify the correct number-line representation of 630 − 215  
**Khan Exercise:** Subtract on a number line  
**Khan Slug:** subtract-on-a-number-line  

**Issues Identified:**
- oversimplified number line missing jump indicators

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- Potentially oversimplified SVG (short text-only content)
- Potentially oversimplified SVG (short text-only content)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x400017b097ce6e49_0004"
    title="Identify the correct number-line representation of 630 − 215"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which number line shows <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>630</mn><mo>−</mo><mn>215</mn></math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='90'%20viewBox='0%200%20420%2090'%3E%3C!-- Distractor A: subtracts 200 then 25 --%3E%3Ctext%20x='210'%20y='45'%3E630%20to%20430%20(-200)%2C%20then%20430%20to%20405%20(-25)%3C/text%3E%3C/svg%3E"
                     alt="Number line with points at 630, 430, and 405. A blue arrow subtracts 200 from 630 to get 430, then a green arrow subtracts 25 from 430 to get 405."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="A">Not quite. This yields 405 rather than the correct result.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='90'%20viewBox='0%200%20420%2090'%3E%3C!-- Correct: subtract 200 then 15 --%3E%3Ctext%20x='210'%20y='45'%3E630%20to%20430%20(-200)%2C%20then%20430%20to%20415%20(-15)%3C/text%3E%3C/svg%3E"
                     alt="Number line with points at 630, 430, and 415. A blue arrow subtracts 200 from 630 to get 430, then a green arrow subtracts 15 from 430 to get 415."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="B">Correct! Subtracting 200 and then 15 gives 630 − 215 = 415.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='420'%20height='90'%20viewBox='0%200%20420%2090'%3E%3C!-- Distractor C: starts at 430 instead of 630 --%3E%3Ctext%20x='210'%20y='45'%3EStarts%20at%20430%2C%20then%20subtracts%20215%20to%20get%20215%3C/text%3E%3C/svg%3E"
                     alt="Number line where the starting value is 430 instead of 630, and subtracting 215 gives 215, which is incorrect."/>
                <qti-feedback-inline outcome-identifier="FEEDBACK" identifier="C">Not quite. The number line should start at 630.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Subtracting 200 then 15 correctly gives 415.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Break 215 into 200 and 15. From 630, subtract 200 to obtain 430, then 430 minus 15 equals 415.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xf20621b19f1ca1ad_0001
**Title:** Addition using a number line: 63 + 18  
**Khan Exercise:** Add within 100 using a number line  
**Khan Slug:** add-sub-within-100-w-num-line  

**Issues Identified:**
- great example of a number line (reference for good implementation)

**Additional SVG Analysis:**
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xf20621b19f1ca1ad_0001"
    title="Addition using a number line: 63 + 18"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>81</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    
    <qti-item-body>
        <p><span class="qti-italic">Use the number line to help you add </span><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>63</mn><mo>+</mo><mn>18</mn></math><span class="qti-italic">.</span></p>

        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120'%3E%3Cdefs%3E%3Cstyle%3E.num%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.label%7Bfont-family:sans-serif;font-size:14px;text-anchor:middle;fill:%234285F4%7D.arr%7Bfill:none;stroke:%234285F4;stroke-width:2;marker-end:url(%23arrowhead)%7D%3C/style%3E%3Cmarker id='arrowhead' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'%3E%3Cpath d='M 0 0 L 10 5 L 0 10 z' fill='%234285F4'/%3E%3C/marker%3E%3C/defs%3E%3Cline x1='10' y1='80' x2='390' y2='80' stroke='%23333' stroke-width='2'/%3E%3Cg class='num'%3E%3Ctext x='30' y='100'%3E63%3C/text%3E%3Cline x1='30' y1='75' x2='30' y2='85' stroke='%23333' stroke-width='1'/%3E%3Ctext x='210' y='100'%3E71%3C/text%3E%3Cline x1='210' y1='75' x2='210' y2='85' stroke='%23333' stroke-width='1'/%3E%3Ctext x='330' y='100'%3E81%3C/text%3E%3Cline x1='330' y1='75' x2='330' y2='85' stroke='%23333' stroke-width='1'/%3E%3C/g%3E%3Cpath class='arr' d='M 30 75 Q 120 15, 210 75' /%3E%3Ctext class='label' x='120' y='25'%3E+8%3C/text%3E%3Cpath class='arr' d='M 210 75 Q 270 35, 330 75' /%3E%3Ctext class='label' x='270' y='40'%3E+10%3C/text%3E%3C/svg%3E" 
                 alt="A number line from 63 to 81 with an arc labeled +8 and another arc labeled +10." 
                 width="400" 
                 height="120"/>
        </div>

        <p>
            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>63</mn><mo>+</mo><mn>18</mn><mo>=</mo></math>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>63</mn><mo>+</mo><mn>18</mn><mo>=</mo><mn>81</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Break 18 into 8 and 10. Start at 63, add 8 to reach 71, then add 10 to get 81.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xed277c00cc2f11f0_0005
**Title:** Cube Roll: Number of Faces  
**Khan Exercise:** Analyze shapes  
**Khan Slug:** analyze-shapes  

**Issues Identified:**
- oversimplified png, cube doesn't work

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xed277c00cc2f11f0_0005"
    title="Cube Roll: Number of Faces"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='180'%20height='180'%20viewBox='0%200%20180%20180'%3E%3Crect%20x='20'%20y='20'%20width='80'%20height='80'%20fill='none'%20stroke='%23000'%20/%3E%3Crect%20x='60'%20y='60'%20width='80'%20height='80'%20fill='none'%20stroke='%23000'%20/%3E%3Cline%20x1='20'%20y1='20'%20x2='60'%20y2='60'%20stroke='%23000'%20/%3E%3C/svg%3E" 
                 alt="A cube diagram"/>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="1">
            <qti-prompt>When you roll a cube, it has several distinct faces. How many individual faces are there on a cube?</qti-prompt>
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> faces
            </qti-simple-choice>
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn></math> faces
            </qti-simple-choice>
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> faces
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> A cube always has 6 faces.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> A cube is a six-faced solid.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xf7e3dd1bce376407_0003
**Title:** Select the correct line plot for crayon measurements  
**Khan Exercise:** Make line plots  
**Khan Slug:** creating-line-plots-1  

**Issues Identified:**
- weird question no visual content if needed just a weird note + dots aren't correctly placed

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG missing viewBox attribute for responsive scaling
- SVG missing viewBox attribute for responsive scaling
- SVG missing viewBox attribute for responsive scaling

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd" identifier="nice_xf7e3dd1bce376407_0003" title="Select the correct line plot for crayon measurements" time-dependent="false" xml:lang="en-US">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
      <qti-correct-response>
          <qti-value>A</qti-value>
      </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
      <qti-default-value>
          <qti-value>0</qti-value>
      </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
  <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>
  <qti-item-body>
      <div id="reference_text">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='265' height='155'%3E%3C!-- Diagram: Four crayon measurements with A=13 cm, B=11 cm, C=7 cm, D=2 cm --%3E%3Crect x='0' y='0' width='265' height='155' fill='white'/%3E%3Ctext x='132.5' y='20' font-size='12' text-anchor='middle'%3ENote:%20A=13cm,%20B=11cm,%20C=7cm,%20D=2cm%3C/text%3E%3C/svg%3E" width="265" height="155" alt="Four crayons: 13 cm, 11 cm, 7 cm, and 2 cm."/>
          <p><span class="qti-italic">Crayon A measures 13 cm, Crayon B measures 11 cm, Crayon C measures 7 cm, and Crayon D measures 2 cm.</span></p>
      </div>
      <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
          <qti-prompt>Which line plot correctly displays these crayon measurements?</qti-prompt>
          <qti-simple-choice identifier="A">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='120'%3E%3Cdefs%3E%3Cstyle%3E.num%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.line%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.dot%7Bfill:%230074c8%7D%3C/style%3E%3C/defs%3E%3Cline class='line' x1='20' y1='90' x2='340' y2='90'/%3E%3Cg class='num'%3E%3Ctext x='20' y='110'%3E0%3C/text%3E%3Ctext x='50' y='110'%3E1%3C/text%3E%3Ctext x='80' y='110'%3E2%3C/text%3E%3Ctext x='110' y='110'%3E3%3C/text%3E%3Ctext x='140' y='110'%3E4%3C/text%3E%3Ctext x='170' y='110'%3E5%3C/text%3E%3Ctext x='200' y='110'%3E6%3C/text%3E%3Ctext x='230' y='110'%3E7%3C/text%3E%3Ctext x='260' y='110'%3E8%3C/text%3E%3Ctext x='290' y='110'%3E9%3C/text%3E%3Ctext x='320' y='110'%3E10%3C/text%3E%3C/g%3E%3Cg class='tick'%3E%3Cline x1='20' y1='85' x2='20' y2='95'/%3E%3Cline x1='50' y1='85' x2='50' y2='95'/%3E%3Cline x1='80' y1='85' x2='80' y2='95'/%3E%3Cline x1='110' y1='85' x2='110' y2='95'/%3E%3Cline x1='140' y1='85' x2='140' y2='95'/%3E%3Cline x1='170' y1='85' x2='170' y2='95'/%3E%3Cline x1='200' y1='85' x2='200' y2='95'/%3E%3Cline x1='230' y1='85' x2='230' y2='95'/%3E%3Cline x1='260' y1='85' x2='260' y2='95'/%3E%3Cline x1='290' y1='85' x2='290' y2='95'/%3E%3Cline x1='320' y1='85' x2='320' y2='95'/%3E%3C/g%3E%3Ccircle class='dot' cx='140' cy='70' r='6'/%3E%3Ccircle class='dot' cx='170' cy='70' r='6'/%3E%3Ccircle class='dot' cx='290' cy='70' r='6'/%3E%3Ccircle class='dot' cx='320' cy='70' r='6'/%3E%3C/svg%3E" alt="Line plot with dots at 2, 7, 11, and 13 cm"/>
              <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! The dots are plotted at 2 cm, 7 cm, 11 cm, and 13 cm.</qti-feedback-inline>
          </qti-simple-choice>
          <qti-simple-choice identifier="B">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='120'%3E%3Cdefs%3E%3Cstyle%3E.num%7Bfont-family:sans-serif;font-size:12px;text-anchor:middle%7D.line%7Bstroke:%23000;stroke-width:2%7D.tick%7Bstroke:%23000;stroke-width:1%7D.dot%7Bfill:%230074c8%7D%3C/style%3E%3C/defs%3E%3Cline class='line' x1='20' y1='90' x2='340' y2='90'/%3E%3Cg class='num'%3E%3Ctext x='20' y='110'%3E0%3C/text%3E%3Ctext x='50' y='110'%3E1%3C/text%3E%3Ctext x='80' y='110'%3E2%3C/text%3E%3Ctext x='110' y='110'%3E3%3C/text%3E%3Ctext x='140' y='110'%3E4%3C/text%3E%3Ctext x='170' y='110'%3E5%3C/text%3E%3Ctext x='200' y='110'%3E6%3C/text%3E%3Ctext x='230' y='110'%3E7%3C/text%3E%3Ctext x='260' y='110'%3E8%3C/text%3E%3Ctext x='290' y='110'%3E9%3C/text%3E%3Ctext x='320' y='110'%3E10%3C/text%3E%3C/g%3E%3Cg class='tick'%3E%3Cline x1='20' y1='85' x2='20' y2='95'/%3E%3Cline x1='50' y1='85' x2='50' y2='95'/%3E%3Cline x1='80' y1='85' x2='80' y2='95'/%3E%3Cline x1='110' y1='85' x2='110' y2='95'/%3E%3Cline x1='140' y1='85' x2='140' y2='95'/%3E%3Cline x1='170' y1='85' x2='170' y2='95'/%3E%3Cline x1='200' y1='85' x2='200' y2='95'/%3E%3Cline x1='230' y1='85' x2='230' y2='95'/%3E%3Cline x1='260' y1='85' x2='260' y2='95'/%3E%3Cline x1='290' y1='85' x2='290' y2='95'/%3E%3Cline x1='320' y1='85' x2='320' y2='95'/%3E%3C/g%3E%3Ccircle class='dot' cx='170' cy='70' r='6'/%3E%3Ccircle class='dot' cx='200' cy='70' r='6'/%3E%3Ccircle class='dot' cx='290' cy='70' r='6'/%3E%3Ccircle class='dot' cx='320' cy='70' r='6'/%3E%3C/svg%3E" alt="Line plot with dots at 7, 11, and 13 cm only"/>
              <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. One measurement is missing.</qti-feedback-inline>
          </qti-simple-choice>
      </qti-choice-interaction>
      <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
          <qti-content-body>
              <p><span class="qti-keyword-emphasis">Correct!</span> The correct line plot in choice A shows dots at 2 cm, 7 cm, 11 cm, and 13 cm corresponding to the given crayon lengths.</p>
          </qti-content-body>
      </qti-feedback-block>
      <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
          <qti-content-body>
              <p><span class="qti-keyword-emphasis">Not quite.</span> Verify each measurement and plot the dots accordingly.</p>
          </qti-content-body>
      </qti-feedback-block>
  </qti-item-body>
  <qti-response-processing>
      <qti-response-condition>
          <qti-response-if>
              <qti-match>
                  <qti-variable identifier="RESPONSE"/>
                  <qti-correct identifier="RESPONSE"/>
              </qti-match>
              <qti-set-outcome-value identifier="SCORE">
                  <qti-base-value base-type="float">1</qti-base-value>
              </qti-set-outcome-value>
              <qti-set-outcome-value identifier="FEEDBACK">
                  <qti-base-value base-type="identifier">CORRECT</qti-base-value>
              </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
              <qti-set-outcome-value identifier="SCORE">
                  <qti-base-value base-type="float">0</qti-base-value>
              </qti-set-outcome-value>
              <qti-set-outcome-value identifier="FEEDBACK">
                  <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
              </qti-set-outcome-value>
          </qti-response-else>
      </qti-response-condition>
  </qti-response-processing>
</qti-assessment-item>

```

---

#### nice_x071a67e238d17911_0001
**Title:** Line Plot Interpretation – Robot Arm Lengths  
**Khan Exercise:** Solve problems with line plots  
**Khan Slug:** solving-problems-with-line-plots-1  

**Issues Identified:**
- this is perfect (reference for good implementation)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x071a67e238d17911_0001"
    title="Line Plot Interpretation – Robot Arm Lengths"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>3</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='460'%20height='140'%20viewBox='0%200%20400%20140'%3E%3Cdefs%3E%3Cstyle%3E.dot%7Bfill:%234285F4;%7D.text%7Bfont-size:12px;fill:black;text-anchor:middle;%7D%3C/style%3E%3C/defs%3E%3Cline%20x1='40'%20y1='100'%20x2='340'%20y2='100'%20stroke='black'%20stroke-width='2'/%3E%3Ctext%20x='40'%20y='120'%20class='text'%3E100%3C/text%3E%3Ctext%20x='90'%20y='120'%20class='text'%3E105%3C/text%3E%3Ctext%20x='140'%20y='120'%20class='text'%3E110%3C/text%3E%3Ctext%20x='190'%20y='120'%20class='text'%3E115%3C/text%3E%3Ctext%20x='240'%20y='120'%20class='text'%3E120%3C/text%3E%3Ccircle%20class='dot'%20cx='40'%20cy='80'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='90'%20cy='80'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='140'%20cy='80'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='190'%20cy='80'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='190'%20cy='60'%20r='6'/%3E%3Ccircle%20class='dot'%20cx='240'%20cy='80'%20r='6'/%3E%3C/svg%3E" 
                 alt="A line plot with tick labels 100, 105, 110, 115, and 120. There is one dot at 100, one at 105, one at 110, two dots at 115, and one dot at 120."/>
            <p><span class="qti-italic">Each dot represents one robot arm length. Count only the dots above numbers greater than 110 cm.</span></p>
        </div>
        <p>How many robot arms are longer than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>110</mn></math> centimeters?</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
            robot arms
        </p>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> There are 3 robot arms with lengths greater than 110 cm.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Look at the number line and count only the dots above the tick marks beyond 110 cm.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>

```

---

#### nice_xb1c48c11e70dbdae_0005
**Title:** Identify rows and columns in a square grid  
**Khan Exercise:** Partitioning rectangles  
**Khan Slug:** partitioning-rectangles  

**Issues Identified:**
- note gives away answer

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xb1c48c11e70dbdae_0005"
    title="Identify rows and columns in a square grid"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='160'%20viewBox='0%200%20160%20160'%3E%3Crect%20x='0'%20y='0'%20width='160'%20height='160'%20fill='none'%20stroke='black'%20stroke-width='2'/%3E%3Cpath%20d='M0%2040h160%20M0%2080h160%20M0%20120h160%20M40%200v160%20M80%200v160%20M120%200v160'%20stroke='black'%20stroke-width='2'/%3E%3C/svg%3E" alt="A square divided into 16 equal squares arranged in 4 rows and 4 columns." width="160" height="160"/>
            <p><span class="qti-italic">The square is divided into 16 equal squares arranged in 4 rows and 4 columns.</span></p>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>How many rows and columns does the square have?</qti-prompt>
            <qti-simple-choice identifier="A">4 rows and 4 columns</qti-simple-choice>
            <qti-simple-choice identifier="B">4 rows and 3 columns</qti-simple-choice>
            <qti-simple-choice identifier="C">3 rows and 4 columns</qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> There are 4 rows and 4 columns.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Reevaluate both the horizontal and vertical partitions of the grid.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
         <qti-response-condition>
              <qti-response-if>
                   <qti-match>
                        <qti-variable identifier="RESPONSE"/>
                        <qti-correct identifier="RESPONSE"/>
                   </qti-match>
                   <qti-set-outcome-value identifier="SCORE">
                        <qti-base-value base-type="float">1</qti-base-value>
                   </qti-set-outcome-value>
                   <qti-set-outcome-value identifier="FEEDBACK">
                        <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                   </qti-set-outcome-value>
              </qti-response-if>
              <qti-response-else>
                   <qti-set-outcome-value identifier="SCORE">
                        <qti-base-value base-type="float">0</qti-base-value>
                   </qti-set-outcome-value>
                   <qti-set-outcome-value identifier="FEEDBACK">
                        <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                   </qti-set-outcome-value>
              </qti-response-else>
         </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xb1c48c11e70dbdae_0004
**Title:** Identify rows and columns in a chocolate bar grid  
**Khan Exercise:** Partitioning rectangles  
**Khan Slug:** partitioning-rectangles  

**Issues Identified:**
- note gives away answer

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xb1c48c11e70dbdae_0004"
    title="Identify rows and columns in a chocolate bar grid"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='90'%20height='150'%20viewBox='0%200%2090%20150'%3E%3Crect%20x='0'%20y='0'%20width='90'%20height='150'%20fill='none'%20stroke='black'%20stroke-width='2'/%3E%3Cpath%20d='M0%2030h90%20M0%2060h90%20M0%2090h90%20M0%20120h90%20M30%200v150%20M60%200v150'%20stroke='black'%20stroke-width='2'/%3E%3C/svg%3E" alt="A chocolate bar divided into 15 equal squares arranged in 5 rows and 3 columns." width="90" height="150"/>
            <p><span class="qti-italic">The chocolate bar is divided into 15 equal pieces arranged in 5 rows and 3 columns.</span></p>
        </div>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>How many rows and columns does the chocolate bar have?</qti-prompt>
            <qti-simple-choice identifier="A">5 rows and 3 columns</qti-simple-choice>
            <qti-simple-choice identifier="B">3 rows and 5 columns</qti-simple-choice>
            <qti-simple-choice identifier="C">4 rows and 4 columns</qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The bar has 5 rows and 3 columns.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Count the horizontal and vertical divisions in the grid to determine the rows and columns.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x3bf67409b2d2116a_0001
**Title:** Johnny Appleseed Picture Graph Variation 1  
**Khan Exercise:** Make picture graphs  
**Khan Slug:** make-picture-graphs-1  

**Issues Identified:**
- picture graph doesn't represent names

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="nice_x3bf67409b2d2116a_0001" title="Johnny Appleseed Picture Graph Variation 1" time-dependent="false" xml:lang="en-US">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>A</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
  <qti-item-body>
    <div id="reference_text">
      <p>Johnny Appleseed planted seeds in four locations. The table below shows the number of seeds he planted at each location:</p>
      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Seeds planted</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Maple Grove</td>
            <td>3</td>
          </tr>
          <tr>
            <td>Pineville</td>
            <td>5</td>
          </tr>
          <tr>
            <td>Oakridge</td>
            <td>4</td>
          </tr>
          <tr>
            <td>Cedar Creek</td>
            <td>5</td>
          </tr>
        </tbody>
      </table>
    </div>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="true">
      <qti-prompt>Which picture graph correctly represents Johnny Appleseed&apos;s planting data?</qti-prompt>
      <qti-simple-choice identifier="A">
        <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%20viewBox='0%200%20400%20300'%3E%3Cdefs%3E%3Cstyle%3E.emoji%7Bfont-size:28px;text-anchor:middle;%7D%3C/style%3E%3C/defs%3E%3Ctext%20class='emoji'%20x='200'%20y='50'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='110'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='170'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='230'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3C/svg%3E" alt="Pictograph: Maple Grove 3, Pineville 5, Oakridge 4, Cedar Creek 5."/>
        <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Correct! The graph shows 3 apples for Maple Grove, 5 for Pineville, 4 for Oakridge, and 5 for Cedar Creek.</qti-feedback-inline>
      </qti-simple-choice>
      <qti-simple-choice identifier="B">
        <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%20viewBox='0%200%20400%20300'%3E%3Cdefs%3E%3Cstyle%3E.emoji%7Bfont-size:28px;text-anchor:middle;%7D%3C/style%3E%3C/defs%3E%3Ctext%20class='emoji'%20x='200'%20y='50'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='110'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='170'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='230'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3C/svg%3E" alt="Pictograph: Maple Grove 3, Pineville 4, Oakridge 4, Cedar Creek 5."/>
        <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. The graph shows Pineville with 4 apples instead of 5.</qti-feedback-inline>
      </qti-simple-choice>
      <qti-simple-choice identifier="C">
        <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%20viewBox='0%200%20400%20300'%3E%3Cdefs%3E%3Cstyle%3E.emoji%7Bfont-size:28px;text-anchor:middle;%7D%3C/style%3E%3C/defs%3E%3Ctext%20class='emoji'%20x='200'%20y='50'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3Ctext%20class='emoji'%20x='200'%20y='110'%3E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%F0%9F%8D%8E%3C/text%3E%3C/svg%3E" alt="Pictograph: Maple Grove 3, Pineville 5, Oakridge 5, Cedar Creek 5."/>
        <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. The graph shows Oakridge with 5 apples instead of 4.</qti-feedback-inline>
      </qti-simple-choice>
    </qti-choice-interaction>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Correct!</span> The pictograph correctly displays 3 for Maple Grove, 5 for Pineville, 4 for Oakridge, and 5 for Cedar Creek.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
      <qti-content-body>
        <p><span class="qti-keyword-emphasis">Not quite.</span> Compare the numbers in the table to the pictograph. The correct graph has 3, 5, 4, and 5 apples respectively.</p>
      </qti-content-body>
    </qti-feedback-block>
  </qti-item-body>
  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match>
          <qti-variable identifier="RESPONSE"/>
          <qti-correct identifier="RESPONSE"/>
        </qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">1</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">CORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0</qti-base-value>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>
</qti-assessment-item>
```

---

#### nice_x30cb68fb11f39014_0002
**Title:** Form the Greatest Three-Digit Number from 4, 7, and 1  
**Khan Exercise:** Create the largest number  
**Khan Slug:** create-the-largest-number  

**Issues Identified:**
- very random question, no context

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x30cb68fb11f39014_0002"
    title="Form the Greatest Three-Digit Number from 4, 7, and 1"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
        <qti-correct-response>
            <qti-value>CHOICE_7</qti-value>
            <qti-value>CHOICE_4</qti-value>
            <qti-value>CHOICE_1</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-order-interaction response-identifier="RESPONSE" shuffle="true" orientation="horizontal">
            <qti-prompt>Arrange the digits to create the greatest three-digit number. Ensure the largest digit is on the left.</qti-prompt>
            <qti-simple-choice identifier="CHOICE_7">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math>
            </qti-simple-choice>
            <qti-simple-choice identifier="CHOICE_4">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math>
            </qti-simple-choice>
            <qti-simple-choice identifier="CHOICE_1">
                <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn></math>
            </qti-simple-choice>
        </qti-order-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Placing the digits in descending order gives 7, 4, 1 which forms 741, the largest number possible from these digits.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember to put the highest digit first, followed by the next highest, and then the smallest digit last.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xcb1b361c5ff0e5b2_0005
**Title:** Olivia's Cupcake Display  
**Khan Exercise:** Array word problems  
**Khan Slug:** array-word-problems  

**Issues Identified:**
- the correct answer has a red box indicating correctness which should be absolutely prohibited + two answers show the same thing...

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xcb1b361c5ff0e5b2_0005"
    title="Olivia's Cupcake Display"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>A</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Olivia is displaying her cupcakes. She arranged them in <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> rows with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cupcakes in each row.</p>
        
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" min-choices="1" max-choices="1">
            <qti-prompt>Which image below shows how Olivia arranged her cupcakes?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='160'%20height='120'%20viewBox='0%200%20160%20120'%3E%3Ccircle%20cx='30'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='80'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='130'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='30'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='80'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='130'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3C/svg%3E"
                     alt="2 rows of 3 cupcakes each."/>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='180'%20height='180'%20viewBox='0%200%20180%20180'%3E%3Ccircle%20cx='30'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='90'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='150'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='30'%20cy='90'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='90'%20cy='90'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='150'%20cy='90'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='30'%20cy='150'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='90'%20cy='150'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='150'%20cy='150'%20r='15'%20fill='%23FF69B4'/%3E%3C/svg%3E"
                     alt="3 rows of 3 cupcakes each."/>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='180'%20height='120'%20viewBox='0%200%20180%20120'%3E%3Ccircle%20cx='30'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='80'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='130'%20cy='30'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='30'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='80'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3Ccircle%20cx='130'%20cy='80'%20r='15'%20fill='%23FF69B4'/%3E%3Crect%20x='10'%20y='10'%20width='20'%20height='20'%20fill='none'%20stroke='red'/%3E%3C/svg%3E"
                     alt="2 rows of 4 cupcakes (one extra cupcake highlighted)"/>
            </qti-simple-choice>
        </qti-choice-interaction>
        
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Olivia arranged her cupcakes in 2 rows with 3 cupcakes per row.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Look for the image that shows exactly 2 rows of 3 cupcakes.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
    
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x45582fcfbc0811d2_0002
**Title:** Estimation Check for 912 + 387  
**Khan Exercise:** Select strategies for adding within 1000  
**Khan Slug:** select-strategies-for-adding-within-1000  

**Issues Identified:**
- i dont think this question makes sense

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x45582fcfbc0811d2_0002"
    title="Estimation Check for 912 + 387"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>B</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" min-choices="1" max-choices="1">
            <qti-prompt>Is Willka’s result equal to <math xmlns="http://www.w3.org/1998/Math/MathML">
                <mrow>
                    <mn>912</mn><mo>+</mo><mn>387</mn>
                </mrow>
            </math>?</qti-prompt>
            
            <qti-simple-choice identifier="A">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                    <mrow>
                        <mn>912</mn><mo>+</mo><mn>387</mn><mo>=</mo><mn>912</mn><mo>+</mo><mn>387</mn>
                    </mrow>
                </math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Not quite. That option shows an exact equality.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="B">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                    <mrow>
                        <mn>912</mn><mo>+</mo><mn>387</mn><mo>&gt;</mo><mn>910</mn><mo>+</mo><mn>385</mn>
                    </mrow>
                </math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Correct! The actual sum 912+387 is greater than the rounded sum 910+385.</qti-feedback-inline>
            </qti-simple-choice>
            
            <qti-simple-choice identifier="C">
                <math xmlns="http://www.w3.org/1998/Math/MathML">
                    <mrow>
                        <mn>912</mn><mo>+</mo><mn>387</mn><mo>&lt;</mo><mn>910</mn><mo>+</mo><mn>385</mn>
                    </mrow>
                </math>
                <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Not quite. This indicates the actual sum is smaller, which is incorrect.</qti-feedback-inline>
            </qti-simple-choice>
        </qti-choice-interaction>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> In fact, 912+387 equals 1299, while 910+385 equals 1295, so the actual sum is greater.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Compare the two sums: 1299 is greater than 1295.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_xfc8bb043ae41e140_0005
**Title:** Total Cupcakes Eaten by Sarah and Emma  
**Khan Exercise:** Solve problems with bar graphs  
**Khan Slug:** solving-problems-with-bar-graphs-2  

**Issues Identified:**
- emojis doesn't represent anything and there's no context to this question

**Additional SVG Analysis:**
- Potentially oversimplified SVG (short text-only content)
- SVG contains only text without proper graphical elements

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_xfc8bb043ae41e140_0005"
    title="Total Cupcakes Eaten by Sarah and Emma"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>8</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='500'%20height='150'%20viewBox='0%200%20500%20150'%3E%3Ctext%20x='50'%20y='50'%20font-size='40'%3E%F0%9F%A7%81%F0%9F%A7%81%F0%9F%A7%81%3C/text%3E%3Ctext%20x='50'%20y='110'%20font-size='40'%3E%F0%9F%A7%81%F0%9F%A7%81%F0%9F%A7%81%F0%9F%A7%81%F0%9F%A7%81%3C/text%3E%3C/svg%3E"
                 alt="A pictograph with two rows of cupcake icons; the first row has 3 cupcakes and the second row has 5 cupcakes." width="500" height="150"/>
            <p><span class="qti-italic">Note: Each cupcake icon represents one cupcake.</span></p>
        </div>
        <p>How many cupcakes did Sarah and Emma eat in total?</p>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3"/>
            cupcakes
        </p>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> Sarah had 3 cupcakes and Emma had 5, so 3 + 5 = 8.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Count each row and add the amounts together to find the total number of cupcakes.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x4766aaba2bf35bd5_0002
**Title:** Complete the steps to add 9 and 47  
**Khan Exercise:** Add 2-digit numbers by making tens  
**Khan Slug:** making-100  

**Issues Identified:**
- i dont know what the correct answer is for this i tried (7, 16 ,16, 56)

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x4766aaba2bf35bd5_0002"
    title="Complete the steps to add 9 and 47"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="BLANK1" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>7</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK2" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>7</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK3" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>16</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK4" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>56</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Complete the equations to solve <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn><mo>+</mo><mn>47</mn></math>.</p>

        <table>
            <tbody>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn><mo>+</mo><mn>47</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn><mo>+</mo><mo>(</mo></math>
                        <qti-text-entry-interaction response-identifier="BLANK1" expected-length="2"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>+</mo><mn>40</mn><mo>)</mo></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo></math>
                        <qti-text-entry-interaction response-identifier="BLANK2" expected-length="2"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>)</mo><mo>+</mo><mn>40</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <qti-text-entry-interaction response-identifier="BLANK3" expected-length="3"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>+</mo><mn>40</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <qti-text-entry-interaction response-identifier="BLANK4" expected-length="3"/>
                    </td>
                </tr>
            </tbody>
        </table>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The completed steps show that <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn><mo>+</mo><mn>47</mn><mo>=</mo><mn>56</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember to break 47 into 7 and 40, add 9 + 7 to get 16, then add 16 + 40 to reach 56.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="BLANK1"/>
                        <qti-correct identifier="BLANK1"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK2"/>
                        <qti-correct identifier="BLANK2"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK3"/>
                        <qti-correct identifier="BLANK3"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK4"/>
                        <qti-correct identifier="BLANK4"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

#### nice_x4766aaba2bf35bd5_0001
**Title:** Complete the steps to add 7 and 68  
**Khan Exercise:** Add 2-digit numbers by making tens  
**Khan Slug:** making-100  

**Issues Identified:**
- i dont know what the correct answer is for this i tried (7, 16 ,16, 56) or im just dumb

**Complete XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="nice_x4766aaba2bf35bd5_0001"
    title="Complete the steps to add 7 and 68"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="BLANK1" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>8</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK2" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>8</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK3" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>15</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-response-declaration identifier="BLANK4" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>75</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <p>Complete the equations to solve <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>+</mo><mn>68</mn></math>.</p>

        <table>
            <tbody>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>+</mo><mn>68</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>+</mo><mo>(</mo></math>
                        <qti-text-entry-interaction response-identifier="BLANK1" expected-length="2"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>+</mo><mn>60</mn><mo>)</mo></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo></math>
                        <qti-text-entry-interaction response-identifier="BLANK2" expected-length="2"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>)</mo><mo>+</mo><mn>60</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <qti-text-entry-interaction response-identifier="BLANK3" expected-length="3"/>
                        <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>+</mo><mn>60</mn></math>
                    </td>
                </tr>
                <tr>
                    <td>
                        <qti-text-entry-interaction response-identifier="BLANK4" expected-length="3"/>
                    </td>
                </tr>
            </tbody>
        </table>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Correct!</span> The completed steps show that <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>+</mo><mn>68</mn><mo>=</mo><mn>75</mn></math>.</p>
            </qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>
                <p><span class="qti-keyword-emphasis">Not quite.</span> Remember to break 68 into 8 and 60, add 7 + 8 to get 15, then add 15 + 60 to reach 75.</p>
            </qti-content-body>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    <qti-match>
                        <qti-variable identifier="BLANK1"/>
                        <qti-correct identifier="BLANK1"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK2"/>
                        <qti-correct identifier="BLANK2"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK3"/>
                        <qti-correct identifier="BLANK3"/>
                    </qti-match>
                    <qti-match>
                        <qti-variable identifier="BLANK4"/>
                        <qti-correct identifier="BLANK4"/>
                    </qti-match>
                </qti-and>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
```

---

