"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type LanguageCode = "en" | "hi" | "te" | "kn";

const labels: Record<LanguageCode, Record<string, string>> = {
  en: {},
  hi: {
    Dashboard: "डैशबोर्ड", Weather: "मौसम", Market: "बाज़ार", Schemes: "योजनाएं", "AI Assistant": "एआई सहायक",
    Profile: "प्रोफ़ाइल", Feedback: "प्रतिक्रिया", Notifications: "सूचनाएं", "Mark all as read": "सभी को पढ़ा हुआ चिह्नित करें",
    "Weather Today": "आज का मौसम", "Market Price (Today)": "आज का बाज़ार भाव", "My Queries": "मेरे प्रश्न", "Schemes for You": "आपके लिए योजनाएं",
    "View full forecast": "पूरा पूर्वानुमान देखें", "View all prices": "सभी भाव देखें", "View schemes": "योजनाएं देखें", "Open AI Assistant": "एआई सहायक खोलें",
    "Add your location in Profile": "प्रोफ़ाइल में अपना स्थान जोड़ें", "Share your experience": "अपना अनुभव साझा करें", "Feedback type": "प्रतिक्रिया प्रकार", "Your feedback": "आपकी प्रतिक्रिया", "Submit feedback": "प्रतिक्रिया भेजें", "Your feedback history": "आपकी प्रतिक्रिया का इतिहास",
    "Ask any question about crops, diseases, schemes, weather and more...": "फसलों, रोगों, योजनाओं, मौसम और अधिक के बारे में कोई भी प्रश्न पूछें...", "Type your question here...": "अपना प्रश्न यहां लिखें...", "Try asking:": "पूछकर देखें:", "Crop Doctor": "फसल डॉक्टर", "Market Prices": "बाज़ार भाव", "Weather Update": "मौसम अपडेट", "Quick Access": "त्वरित पहुँच",
    "Government Schemes for You": "आपके लिए सरकारी योजनाएं", "Recent Activity": "हाल की गतिविधि", "View All": "सभी देखें", "Eligible": "पात्र", "Crop insurance scheme for farmers": "किसानों के लिए फसल बीमा योजना", "Get easy credit for your farming needs": "खेती की जरूरतों के लिए आसान ऋण", "Free soil testing and health report": "निःशुल्क मिट्टी परीक्षण और स्वास्थ्य रिपोर्ट",
    "You asked about Paddy cultivation": "आपने धान की खेती के बारे में पूछा", "Weather update checked": "मौसम अपडेट देखा", "Soil health report viewed": "मिट्टी स्वास्थ्य रिपोर्ट देखी", "Checked PMFBY scheme": "PMFBY योजना देखी",
  },
  te: {
    Dashboard: "డాష్‌బోర్డ్", Weather: "వాతావరణం", Market: "మార్కెట్", Schemes: "పథకాలు", "AI Assistant": "ఏఐ సహాయకుడు",
    Profile: "ప్రొఫైల్", Feedback: "అభిప్రాయం", Notifications: "నోటిఫికేషన్లు", "Mark all as read": "అన్నీ చదివినవిగా గుర్తించు",
    "Weather Today": "నేటి వాతావరణం", "Market Price (Today)": "నేటి మార్కెట్ ధర", "My Queries": "నా ప్రశ్నలు", "Schemes for You": "మీ కోసం పథకాలు",
    "View full forecast": "పూర్తి అంచనా చూడండి", "View all prices": "అన్ని ధరలు చూడండి", "View schemes": "పథకాలు చూడండి", "Open AI Assistant": "ఏఐ సహాయకుడిని తెరవండి",
    "Add your location in Profile": "ప్రొఫైల్‌లో మీ స్థలాన్ని జోడించండి", "Share your experience": "మీ అనుభవాన్ని పంచుకోండి", "Feedback type": "అభిప్రాయ రకం", "Your feedback": "మీ అభిప్రాయం", "Submit feedback": "అభిప్రాయం పంపండి", "Your feedback history": "మీ అభిప్రాయ చరిత్ర",
    "Ask any question about crops, diseases, schemes, weather and more...": "పంటలు, వ్యాధులు, పథకాలు, వాతావరణం మరియు మరిన్నింటి గురించి ప్రశ్న అడగండి...", "Type your question here...": "మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...", "Try asking:": "అడిగి చూడండి:", "Crop Doctor": "పంట వైద్యుడు", "Market Prices": "మార్కెట్ ధరలు", "Weather Update": "వాతావరణ సమాచారం", "Quick Access": "త్వరిత ప్రాప్యత",
    "Government Schemes for You": "మీ కోసం ప్రభుత్వ పథకాలు", "Recent Activity": "ఇటీవలి కార్యకలాపం", "View All": "అన్నీ చూడండి", "Eligible": "అర్హులు", "Crop insurance scheme for farmers": "రైతుల కోసం పంట బీమా పథకం", "Get easy credit for your farming needs": "వ్యవసాయ అవసరాలకు సులభ రుణం", "Free soil testing and health report": "ఉచిత నేల పరీక్ష మరియు ఆరోగ్య నివేదిక",
    "You asked about Paddy cultivation": "మీరు వరి సాగు గురించి అడిగారు", "Weather update checked": "వాతావరణ సమాచారాన్ని చూశారు", "Soil health report viewed": "నేల ఆరోగ్య నివేదికను చూశారు", "Checked PMFBY scheme": "PMFBY పథకాన్ని చూశారు",
  },
  kn: {
    Dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", Weather: "ಹವಾಮಾನ", Market: "ಮಾರುಕಟ್ಟೆ", Schemes: "ಯೋಜನೆಗಳು", "AI Assistant": "ಎಐ ಸಹಾಯಕ",
    Profile: "ಪ್ರೊಫೈಲ್", Feedback: "ಪ್ರತಿಕ್ರಿಯೆ", Notifications: "ಅಧಿಸೂಚನೆಗಳು", "Mark all as read": "ಎಲ್ಲವನ್ನೂ ಓದಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ",
    "Weather Today": "ಇಂದಿನ ಹವಾಮಾನ", "Market Price (Today)": "ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ", "My Queries": "ನನ್ನ ಪ್ರಶ್ನೆಗಳು", "Schemes for You": "ನಿಮಗಾಗಿ ಯೋಜನೆಗಳು",
    "View full forecast": "ಸಂಪೂರ್ಣ ಮುನ್ಸೂಚನೆ ನೋಡಿ", "View all prices": "ಎಲ್ಲಾ ಬೆಲೆಗಳನ್ನು ನೋಡಿ", "View schemes": "ಯೋಜನೆಗಳನ್ನು ನೋಡಿ", "Open AI Assistant": "ಎಐ ಸಹಾಯಕವನ್ನು ತೆರೆಯಿರಿ",
    "Add your location in Profile": "ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಸೇರಿಸಿ", "Share your experience": "ನಿಮ್ಮ ಅನುಭವವನ್ನು ಹಂಚಿಕೊಳ್ಳಿ", "Feedback type": "ಪ್ರತಿಕ್ರಿಯೆ ಪ್ರಕಾರ", "Your feedback": "ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ", "Submit feedback": "ಪ್ರತಿಕ್ರಿಯೆ ಕಳುಹಿಸಿ", "Your feedback history": "ನಿಮ್ಮ ಪ್ರತಿಕ್ರಿಯೆ ಇತಿಹಾಸ",
    "Ask any question about crops, diseases, schemes, weather and more...": "ಬೆಳೆಗಳು, ರೋಗಗಳು, ಯೋಜನೆಗಳು, ಹವಾಮಾನ ಮತ್ತು ಇನ್ನಷ್ಟು ಕುರಿತು ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ...", "Type your question here...": "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...", "Try asking:": "ಕೇಳಲು ಪ್ರಯತ್ನಿಸಿ:", "Crop Doctor": "ಬೆಳೆ ವೈದ್ಯ", "Market Prices": "ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು", "Weather Update": "ಹವಾಮಾನ ಮಾಹಿತಿ", "Quick Access": "ತ್ವರಿತ ಪ್ರವೇಶ",
    "Government Schemes for You": "ನಿಮಗಾಗಿ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು", "Recent Activity": "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ", "View All": "ಎಲ್ಲಾ ನೋಡಿ", "Eligible": "ಅರ್ಹ", "Crop insurance scheme for farmers": "ರೈತರಿಗಾಗಿ ಬೆಳೆ ವಿಮಾ ಯೋಜನೆ", "Get easy credit for your farming needs": "ನಿಮ್ಮ ಕೃಷಿ ಅಗತ್ಯಗಳಿಗೆ ಸುಲಭ ಸಾಲ ಪಡೆಯಿರಿ", "Free soil testing and health report": "ಉಚಿತ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ ಮತ್ತು ಆರೋಗ್ಯ ವರದಿ",
    "You asked about Paddy cultivation": "ನೀವು ಭತ್ತದ ಕೃಷಿಯ ಬಗ್ಗೆ ಕೇಳಿದ್ದೀರಿ", "Weather update checked": "ಹವಾಮಾನ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ", "Soil health report viewed": "ಮಣ್ಣಿನ ಆರೋಗ್ಯ ವರದಿ ವೀಕ್ಷಿಸಲಾಗಿದೆ", "Checked PMFBY scheme": "PMFBY ಯೋಜನೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
  },
};

// Kept separate from the first group so new screens can use the same `t()`
// function without duplicating language-selection logic.
const extraLabels: Record<LanguageCode, Record<string, string>> = {
  en: {},
  hi: {
    "How to control leaf curl?": "\u092a\u0924\u094d\u0924\u0940 \u092e\u0941\u0921\u093c\u0928\u0947 \u0915\u0940 \u092c\u0940\u092e\u093e\u0930\u0940 \u0915\u094b \u0915\u0948\u0938\u0947 \u0928\u093f\u092f\u0902\u0924\u094d\u0930\u093f\u0924 \u0915\u0930\u0947\u0902?",
    "Best fertilizer for tomato": "\u091f\u092e\u093e\u091f\u0930 \u0915\u0947 \u0932\u093f\u090f \u0938\u092c\u0938\u0947 \u0905\u091a\u094d\u091b\u0940 \u0916\u093e\u0926", "PMFBY scheme details": "PMFBY \u092f\u094b\u091c\u0928\u093e \u0935\u093f\u0935\u0930\u0923", "Current weather": "\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u092e\u094c\u0938\u092e",
    "Query history will appear here": "\u092a\u094d\u0930\u0936\u094d\u0928 \u0907\u0924\u093f\u0939\u093e\u0938 \u092f\u0939\u093e\u0901 \u0926\u093f\u0916\u093e\u0908 \u0926\u0947\u0917\u093e", "Loading weather...": "\u092e\u094c\u0938\u092e \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...", "Loading market price...": "\u092c\u093e\u091c\u093e\u0930 \u092d\u093e\u0935 \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...", "Nearest available record:": "\u0928\u093f\u0915\u091f\u0924\u092e \u0909\u092a\u0932\u092c\u094d\u0927 \u0930\u093f\u0915\u0949\u0930\u094d\u0921:", "No notifications yet.": "\u0905\u092d\u0940 \u0915\u094b\u0908 \u0938\u0942\u091a\u0928\u093e \u0928\u0939\u0940\u0902 \u0939\u0948।",
    "Weather update": "\u092e\u094c\u0938\u092e \u0905\u092a\u0921\u0947\u091f", "Rain is expected in your selected location.": "\u0906\u092a\u0915\u0947 \u091a\u0941\u0928\u0947 \u0939\u0941\u090f \u0938\u094d\u0925\u093e\u0928 \u092a\u0930 \u092c\u093e\u0930\u093f\u0936 \u0915\u0940 \u0938\u0902\u092d\u093e\u0935\u0928\u093e \u0939\u0948।", "Market price update": "\u092c\u093e\u091c\u093e\u0930 \u092d\u093e\u0935 \u0905\u092a\u0921\u0947\u091f", "New mandi prices are available for paddy.": "\u0927\u093e\u0928 \u0915\u0947 \u0928\u090f \u092e\u0902\u0921\u0940 \u092d\u093e\u0935 \u0909\u092a\u0932\u092c\u094d\u0927 \u0939\u0948\u0902।", "New government scheme": "\u0928\u0908 \u0938\u0930\u0915\u093e\u0930\u0940 \u092f\u094b\u091c\u0928\u093e", "A scheme may be relevant to your farm profile.": "\u0906\u092a\u0915\u0947 \u0916\u0947\u0924 \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932 \u0915\u0947 \u0932\u093f\u090f \u090f\u0915 \u092f\u094b\u091c\u0928\u093e \u0909\u092a\u092f\u094b\u0917\u0940 \u0939\u094b \u0938\u0915\u0924\u0940 \u0939\u0948।",
    "2 hours ago": "2 \u0918\u0902\u091f\u0947 \u092a\u0939\u0932\u0947", "5 hours ago": "5 \u0918\u0902\u091f\u0947 \u092a\u0939\u0932\u0947", "1 day ago": "1 \u0926\u093f\u0928 \u092a\u0939\u0932\u0947", "2 days ago": "2 \u0926\u093f\u0928 \u092a\u0939\u0932\u0947", "For": "\u0915\u0947 \u0932\u093f\u090f",
  },
  te: {
    "How to control leaf curl?": "\u0906\u0915\u0941 \u092e\u0921\u091a \u0935\u094d\u092f\u093e\u0927\u093f\u0928\u093f \u090e\u0932\u093e \u0928\u093f\u092f\u0902\u0924\u094d\u0930\u093f\u0902\u091a\u093e\u0932\u093f?", "Best fertilizer for tomato": "\u091f\u092e\u093e\u091f\u093e\u0915\u0941 \u0909\u0924\u094d\u0924\u092e \u090e\u0930\u0941\u0935\u0941", "PMFBY scheme details": "PMFBY \u092a\u0925\u0915\u092e\u0941 \u0935\u093f\u0935\u0930\u093e\u0932\u0941", "Current weather": "\u092a\u094d\u0930\u0938\u094d\u0924\u0941\u0924 \u0935\u093e\u0924\u093e\u0935\u0930\u0923\u0902",
    "Query history will appear here": "\u092e\u0940 \u092a\u094d\u0930\u0936\u094d\u0928\u093e\u0932 \u091a\u0930\u093f\u0924\u094d\u0930 \u0907\u0915\u094d\u0915\u0921 \u0915\u0928\u093f\u092a\u093f\u0938\u094d\u0924\u0941\u0902\u0926\u093f", "Loading weather...": "\u0935\u093e\u0924\u093e\u0935\u0930\u0923\u0902 \u0932\u094b\u0921 \u0905\u0935\u0941\u0924\u0941\u0902\u0926\u093f...", "Loading market price...": "\u092e\u093e\u0930\u094d\u0915\u0946\u091f\u094d \u0927\u0930 \u0932\u094b\u0921 \u0905\u0935\u0941\u0924\u0941\u0902\u0926\u093f...", "Nearest available record:": "\u0938\u092e\u0940\u092a\u0902\u0932\u094b \u0909\u0928\u094d\u0928 \u0930\u093f\u0915\u093e\u0930\u094d\u0921:", "No notifications yet.": "\u0907\u0902\u0915\u093e \u0928\u094b\u091f\u093f\u092b\u093f\u0915\u0947\u0936\u0928\u094d\u0932\u0941 \u0932\u0947\u0935\u0941।",
    "Weather update": "\u0935\u093e\u0924\u093e\u0935\u0930\u0923 \u0938\u092e\u093e\u091a\u093e\u0930\u0902", "Rain is expected in your selected location.": "\u092e\u0940\u0930\u0941 \u090e\u0902\u091a\u0941\u0915\u0941\u0928\u094d\u0928 \u092a\u094d\u0930\u0926\u0947\u0936\u0902\u0932\u094b \u0935\u0930\u094d\u0937\u0902 \u092a\u0921\u0947 \u0905\u0935\u0915\u093e\u0936\u0902 \u0909\u0902\u0926\u093f।", "Market price update": "\u092e\u093e\u0930\u094d\u0915\u0946\u091f\u094d \u0927\u0930 \u0938\u092e\u093e\u091a\u093e\u0930\u0902", "New mandi prices are available for paddy.": "\u0935\u0930\u093f\u0915\u093f \u0915\u094a\u0924\u094d\u0924 \u092e\u0902\u0921\u0940 \u0927\u0930\u0932\u0941 \u0909\u092a\u0932\u092c\u094d\u0927\u0902\u0917\u093e \u0909\u0928\u094d\u0928\u093e\u092f\u093f।", "New government scheme": "\u0915\u094a\u0924\u094d\u0924 \u092a\u094d\u0930\u092d\u0941\u0924\u094d\u0935 \u092a\u0925\u0915\u0902", "A scheme may be relevant to your farm profile.": "\u0912\u0915 \u092a\u0925\u0915\u0902 \u092e\u0940 \u0935\u094d\u092f\u0935\u0938\u093e\u092f \u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932\u094d\u0915\u0941 \u0938\u0930\u093f\u092a\u094b\u0935\u091a\u094d\u091a\u0941।",
    "2 hours ago": "2 \u0917\u0902\u091f\u0932 \u0915\u094d\u0930\u093f\u0924\u0902", "5 hours ago": "5 \u0917\u0902\u091f\u0932 \u0915\u094d\u0930\u093f\u0924\u0902", "1 day ago": "1 \u0930\u094b\u091c\u0941 \u0915\u094d\u0930\u093f\u0924\u0902", "2 days ago": "2 \u0930\u094b\u091c\u0941\u0932 \u0915\u094d\u0930\u093f\u0924\u0902", "For": "\u0915\u094b\u0938\u092e",
  },
  kn: {
    "How to control leaf curl?": "\u090e\u0932\u0946 \u0938\u0941\u0930\u0941\u0933\u093f \u0930\u094b\u0917\u0935\u0928\u094d\u0928\u0941 \u0939\u0947\u0917\u0946 \u0928\u093f\u092f\u0902\u0924\u094d\u0930\u093f\u0938\u092c\u0947\u0915\u0941?", "Best fertilizer for tomato": "\u091f\u094a\u092e\u094d\u092f\u093e\u091f\u094b\u0917\u0946 \u0909\u0924\u094d\u0924\u092e \u092a\u0941\u0930\u0941\u0917\u0941", "PMFBY scheme details": "PMFBY \u092f\u094b\u091c\u0928\u0947\u092f \u0935\u093f\u0935\u0930\u0917\u0933\u0941", "Current weather": "\u092a\u094d\u0930\u0938\u094d\u0924\u0941\u0924 \u0939\u0935\u093e\u092e\u093e\u0928",
    "Query history will appear here": "\u0928\u093f\u092e\u094d\u092e \u092a\u094d\u0930\u0936\u094d\u0928\u0947 \u0907\u0924\u093f\u0939\u093e\u0938\u0935\u0941 \u0907\u0932\u094d\u0932\u093f \u0915\u093e\u0923\u093f\u0938\u093f\u0915\u094a\u0933\u094d\u0933\u0941\u0924\u094d\u0924\u0926\u0947", "Loading weather...": "\u0939\u0935\u093e\u092e\u093e\u0928 \u0932\u094b\u0921\u094d \u0906\u0917\u0941\u0924\u094d\u0924\u093f\u0926\u0947...", "Loading market price...": "\u092e\u093e\u0930\u0941\u0915\u091f\u094d\u091f\u0946 \u092c\u0946\u0932\u0946 \u0932\u094b\u0921\u094d \u0906\u0917\u0941\u0924\u094d\u0924\u093f\u0926\u0947...", "Nearest available record:": "\u0939\u0924\u094d\u0924\u093f\u0930\u0926 \u0932\u092d\u094d\u092f\u0935\u093f\u0930\u0941\u0935 \u0926\u093e\u0916\u0932\u0946:", "No notifications yet.": "\u0907\u0928\u094d\u0928\u0942 \u092f\u093e\u0935\u0941\u0926\u0947 \u0905\u0927\u093f\u0938\u0942\u091a\u0928\u0946\u0917\u0933\u093f\u0932\u094d\u0932\u0964",
    "Weather update": "\u0939\u0935\u093e\u092e\u093e\u0928 \u092e\u093e\u0939\u093f\u0924\u093f", "Rain is expected in your selected location.": "\u0928\u093f\u092e\u094d\u092e \u0906\u092f\u094d\u0915\u0946\u092f \u0938\u094d\u0925\u0933\u0926\u0932\u094d\u0932\u093f \u092e\u0933\u0946\u092f \u0928\u093f\u0930\u0940\u0915\u094d\u0937\u093f\u0938\u0932\u093e\u0917\u093f\u0926\u0947\u0964", "Market price update": "\u092e\u093e\u0930\u0941\u0915\u091f\u094d\u091f\u0946 \u092c\u0946\u0932\u0946 \u092e\u093e\u0939\u093f\u0924\u093f", "New mandi prices are available for paddy.": "\u092d\u0924\u094d\u0924\u0926\u093f\u0917\u0946 \u0939\u094a\u0938 \u092e\u0902\u0921\u093f \u092c\u0946\u0932\u0946\u0917\u0933\u0941 \u0932\u092d\u094d\u092f\u0935\u093f\u0935\u0946\u0964", "New government scheme": "\u0939\u094a\u0938 \u0938\u0930\u094d\u0915\u093e\u0930\u0940 \u092f\u094b\u091c\u0928\u0946", "A scheme may be relevant to your farm profile.": "\u092f\u094b\u091c\u0928\u0946\u092f\u0941 \u0928\u093f\u092e\u094d\u092e \u0939\u094a\u0932 \u092a\u094d\u0930\u094a\u092b\u0948\u0932\u094d\u0917\u0946 \u0938\u0930\u093f\u0939\u094a\u0902\u0926\u092c\u0939\u0941\u0926\u0941\u0964",
    "2 hours ago": "2 \u0917\u0902\u091f\u0946\u0917\u0933 \u0939\u093f\u0902\u0926\u0947", "5 hours ago": "5 \u0917\u0902\u091f\u0946\u0917\u0933 \u0939\u093f\u0902\u0926\u0947", "1 day ago": "1 \u0926\u093f\u0928\u0926 \u0939\u093f\u0902\u0926\u0947", "2 days ago": "2 \u0926\u0935\u0938\u0917\u0933 \u0939\u093f\u0902\u0926\u0947", "For": "ಗಾಗಿ",
  },
};

// Human-reviewed wording for the dashboard prompts and status text.
const reviewedUiLabels: Partial<Record<LanguageCode, Record<string, string>>> = {
  te: {
    "How to control leaf curl?": "ఆకు ముడతను ఎలా నియంత్రించాలి?", "Best fertilizer for tomato": "టమాటాకు ఉత్తమ ఎరువు", "PMFBY scheme details": "PMFBY పథకం వివరాలు", "Current weather": "ప్రస్తుత వాతావరణం",
    "Query history will appear here": "ప్రశ్నల చరిత్ర ఇక్కడ కనిపిస్తుంది", "Loading weather...": "వాతావరణం లోడ్ అవుతోంది...", "Loading market price...": "మార్కెట్ ధర లోడ్ అవుతోంది...", "Nearest available record:": "సమీపంలో అందుబాటులో ఉన్న నమోదు:", "No notifications yet.": "ఇంకా నోటిఫికేషన్లు లేవు.",
    "Weather update": "వాతావరణ సమాచారం", "Rain is expected in your selected location.": "మీరు ఎంచుకున్న ప్రాంతంలో వర్షం పడే అవకాశం ఉంది.", "Market price update": "మార్కెట్ ధర సమాచారం", "New mandi prices are available for paddy.": "వరి కోసం కొత్త మండీ ధరలు అందుబాటులో ఉన్నాయి.", "New government scheme": "కొత్త ప్రభుత్వ పథకం", "A scheme may be relevant to your farm profile.": "ఒక పథకం మీ వ్యవసాయ ప్రొఫైల్‌కు సరిపోవచ్చు.",
    "2 hours ago": "2 గంటల క్రితం", "5 hours ago": "5 గంటల క్రితం", "1 day ago": "1 రోజు క్రితం", "2 days ago": "2 రోజుల క్రితం", "For": "కోసం",
  },
  kn: {
    "How to control leaf curl?": "ಎಲೆ ಸುರುಳಿಯನ್ನು ಹೇಗೆ ನಿಯಂತ್ರಿಸುವುದು?", "Best fertilizer for tomato": "ಟೊಮೆಟೊಗೆ ಉತ್ತಮ ಗೊಬ್ಬರ", "PMFBY scheme details": "PMFBY ಯೋಜನೆ ವಿವರಗಳು", "Current weather": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ",
    "Query history will appear here": "ಪ್ರಶ್ನೆಗಳ ಇತಿಹಾಸ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ", "Loading weather...": "ಹವಾಮಾನ ಲೋಡ್ ಆಗುತ್ತಿದೆ...", "Loading market price...": "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...", "Nearest available record:": "ಹತ್ತಿರದ ಲಭ್ಯ ದಾಖಲೆ:", "No notifications yet.": "ಇನ್ನೂ ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ.",
    "Weather update": "ಹವಾಮಾನ ಮಾಹಿತಿ", "Rain is expected in your selected location.": "ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ಸ್ಥಳದಲ್ಲಿ ಮಳೆಯ ನಿರೀಕ್ಷೆಯಿದೆ.", "Market price update": "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಮಾಹಿತಿ", "New mandi prices are available for paddy.": "ಭತ್ತಕ್ಕೆ ಹೊಸ ಮಂಡಿ ಬೆಲೆಗಳು ಲಭ್ಯವಿವೆ.", "New government scheme": "ಹೊಸ ಸರ್ಕಾರಿ ಯೋಜನೆ", "A scheme may be relevant to your farm profile.": "ಒಂದು ಯೋಜನೆ ನಿಮ್ಮ ಕೃಷಿ ಪ್ರೊಫೈಲ್‌ಗೆ ಸರಿಹೊಂದಬಹುದು.",
    "2 hours ago": "2 ಗಂಟೆಗಳ ಹಿಂದೆ", "5 hours ago": "5 ಗಂಟೆಗಳ ಹಿಂದೆ", "1 day ago": "1 ದಿನದ ಹಿಂದೆ", "2 days ago": "2 ದಿನಗಳ ಹಿಂದೆ", "For": "ಗಾಗಿ",
  },
};

const LanguageContext = createContext({ language: "en" as LanguageCode, t: (text: string) => text });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem("language") as LanguageCode | null;
      setLanguage(stored && labels[stored] ? stored : "en");
    };
    sync(); window.addEventListener("languagechange", sync);
    return () => window.removeEventListener("languagechange", sync);
  }, []);
  return <LanguageContext.Provider value={{ language, t: (text) => reviewedUiLabels[language]?.[text] || extraLabels[language][text] || labels[language][text] || text }}>{children}</LanguageContext.Provider>;
}

export const useTranslation = () => useContext(LanguageContext);
