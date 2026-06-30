import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * MathText - A reusable React Native component to render LaTeX math equations beautifully.
 * Accepts any string containing LaTeX delimiters $...$ for inline and $$...$$ for block display.
 * Uses an embedded KaTeX WebView with dynamic height calculation.
 */
export default function MathText({ text }) {
  const [webViewHeight, setWebViewHeight] = useState(40);
  const [hasError, setHasError] = useState(false);

  if (!text) return null;

  // Fallback if WebView fails: strip delimiters to maximize readability
  const renderFallback = () => {
    const cleaned = text.replace(/\$\$/g, '').replace(/\$/g, '');
    return <Text style={styles.fallbackText}>{cleaned}</Text>;
  };

  if (hasError) {
    return renderFallback();
  }

  // Escape HTML entities and characters for the WebView injection
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" crossorigin="anonymous">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js" crossorigin="anonymous"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" crossorigin="anonymous" onload="renderMath()"></script>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #0A1128;
            margin: 0;
            padding: 2px;
            background-color: transparent;
          }
          #math-container {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .katex-display {
            margin: 8px 0;
            overflow-x: auto;
            overflow-y: hidden;
          }
        </style>
        <script>
          function renderMath() {
            try {
              var container = document.getElementById('math-container');
              if (window.renderMathInElement) {
                window.renderMathInElement(container, {
                  delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                  ],
                  throwOnError: false
                });
              }
              // Send the exact rendering height back to the React Native component
              setTimeout(function() {
                var height = document.documentElement.scrollHeight || document.body.scrollHeight;
                window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
              }, 100);
            } catch (err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ error: err.message }));
            }
          }
        </script>
      </head>
      <body>
        <div id="math-container">${escapedText}</div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        overScrollMode="never"
        backgroundColor="transparent"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height) {
              setWebViewHeight(Math.max(40, data.height + 4));
            } else if (data.error) {
              setHasError(true);
            }
          } catch {
            // Ignore
          }
        }}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webView: {
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
  fallbackText: {
    fontSize: 14,
    color: '#0A1128',
    lineHeight: 20,
  },
});
