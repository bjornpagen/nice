# Rendering QTI

We have a web page that render QTI Items which URL can be used to embed QTI Content in any HTML page.

The URL has the format: `https://alpha-powerpath-ui-production.up.railway.app/qti-embed/[identifier]`

Example: [https://alpha-powerpath-ui-production.up.railway.app/qti-embed/noun-identification-item-mom](https://alpha-powerpath-ui-production.up.railway.app/qti-embed/noun-identification-item-mom) 

This can be embedded in any webpage using an iframe like so

```javascript
<iframe src="https://alpha-powerpath-ui-production.up.railway.app/qti-embed/noun-identification-item-mom" />
```

An event is emitted every time user changes the response and can be captured like so

```javascript
<script>
window.addEventListener('message', (event) => {
  if (event.data.type === 'QTI_RESPONSE_CHANGE') {
    // Handle the QTI response data
    const { responseIdentifier, response } = event.data;
    
    // Process the data as needed
    console.log({ responseIdentifier, response })
  }
});
</script>
```

