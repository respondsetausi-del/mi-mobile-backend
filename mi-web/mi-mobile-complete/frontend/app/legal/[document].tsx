import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// Legal document contents
const LEGAL_DOCUMENTS: { [key: string]: { title: string; content: string } } = {
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `Effective Date: June 1, 2025
Last Updated: June 1, 2025

INTRODUCTION

Welcome to Mobile Indicator ("we", "us", "our", or "the App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services. By using Mobile Indicator, you agree to the collection and use of information in accordance with this policy.

Contact Information:
Email: mimobileindicator@gmail.com

1. INFORMATION WE COLLECT

1.1 Personal Information
When you register for and use Mobile Indicator, we may collect:
• Account Information: Name, email address, password (encrypted)
• Profile Information: Username, mentor assignment, license keys
• Payment Information: Payment status, transaction records (processed securely through Stripe)
• Device Information: Device type, operating system, unique device identifiers
• Push Notification Tokens: For delivering trading signals and alerts

1.2 Trading and Usage Data
• Expert Advisor (EA) Configurations: MT4/MT5 server details, EA names, trading preferences
• Indicator Subscriptions: Custom indicators you subscribe to
• Signal History: Trading signals received (BUY/SELL/NONE)
• Market Data Interactions: Quotes viewed, symbols tracked
• App Usage: Features accessed, session duration, interaction patterns

1.3 Automatically Collected Information
• Log Data: IP address, access times, app errors, performance metrics
• Analytics Data: Usage statistics, feature engagement, crash reports

2. HOW WE USE YOUR INFORMATION

We use collected information for the following purposes:

2.1 Core Services
• Provide and maintain the Mobile Indicator platform
• Authenticate users and manage accounts
• Process payments and maintain subscription status
• Deliver real-time trading signals via push notifications
• Facilitate mentor-user relationships and custom indicator sharing
• Generate news alerts and market events

2.2 Communication
• Send important service updates and system notifications
• Deliver trading signals and custom indicator alerts
• Respond to support requests and inquiries
• Send administrative messages about your account

2.3 Improvement and Analytics
• Analyze app usage to improve features and user experience
• Monitor performance and troubleshoot technical issues
• Develop new features based on user behavior patterns
• Conduct research and statistical analysis

2.4 Security and Compliance
• Detect and prevent fraud, abuse, and security incidents
• Verify user identity and authorize access
• Comply with legal obligations and enforce our Terms and Conditions

3. INFORMATION SHARING AND DISCLOSURE

3.1 With Your Mentor
If you are assigned to a mentor:
• Your mentor can view your account status, license key, and activity
• Mentors can send you custom indicators and manual trading signals
• Your usage of custom indicators may be visible to your mentor

3.2 Service Providers
We share information with third-party service providers:
• Stripe: Payment processing (subject to Stripe's Privacy Policy)
• Push Notification Services: For delivering trading alerts
• Cloud Hosting: MongoDB Atlas, server infrastructure providers
• Analytics Tools: For app performance and usage analysis

3.3 Legal Requirements
We may disclose information if required to:
• Comply with legal obligations (court orders, subpoenas)
• Protect rights, property, or safety of Mobile Indicator, users, or the public
• Enforce our Terms and Conditions
• Investigate potential violations or fraud

4. DATA SECURITY

We implement industry-standard security measures to protect your information:
• Encryption: Passwords are hashed using bcrypt; data transmission uses HTTPS/TLS
• Access Controls: Role-based access (Admin, Mentor, User) with JWT authentication
• Secure Payment Processing: PCI-compliant payment handling via Stripe
• Regular Security Audits: Monitoring for vulnerabilities and threats

However, no method of electronic transmission or storage is 100% secure.

5. YOUR RIGHTS AND CHOICES

Depending on your jurisdiction, you may have the following rights:
• Request a copy of your personal information
• Update your profile information within the app
• Request deletion of your account and associated data
• Opt-out of push notifications
• Object to processing based on legitimate interests

To exercise these rights, contact us at mimobileindicator@gmail.com

6. CHILDREN'S PRIVACY

Mobile Indicator is NOT intended for users under 18 years of age. We do not knowingly collect personal information from children. If we discover that a child under 18 has provided personal information, we will delete it immediately.

7. CHANGES TO THIS PRIVACY POLICY

We may update this Privacy Policy periodically. Changes will be posted within the app with an updated "Last Updated" date. Continued use of Mobile Indicator after changes constitutes acceptance of the revised policy.

8. CONTACT US

For questions, concerns, or requests regarding this Privacy Policy:

Email: mimobileindicator@gmail.com
Subject Line: Privacy Policy Inquiry

We will respond to all inquiries within 30 business days.

Mobile Indicator
mimobileindicator@gmail.com
Last Updated: June 1, 2025`,
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    content: `Effective Date: June 1, 2025
Last Updated: June 1, 2025

INTRODUCTION

Welcome to Mobile Indicator ("the App", "we", "us", or "our"). These Terms and Conditions ("Terms") govern your access to and use of the Mobile Indicator mobile application and related services. By creating an account and using the App, you agree to be bound by these Terms.

IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE APP.

Contact Information:
Email: mimobileindicator@gmail.com

1. ACCEPTANCE OF TERMS

By registering for, accessing, or using Mobile Indicator, you:
• Acknowledge you have read and understood these Terms
• Agree to comply with all applicable laws and regulations
• Confirm you are at least 18 years of age
• Accept our Privacy Policy (incorporated by reference)

2. DESCRIPTION OF SERVICE

Mobile Indicator is a trading signal platform that provides:
• Real-time BUY/SELL/NONE trading signals
• Custom indicator subscriptions from assigned mentors
• Expert Advisor (EA) management for MT4/MT5 platforms
• Market news and economic event notifications
• Broker affiliate links and resources
• Push notifications for trading alerts

IMPORTANT: Mobile Indicator is a tool for informational purposes only. We do not provide financial advice, execute trades on your behalf, or guarantee trading results.

3. USER ROLES AND ACCOUNTS

3.1 Account Types
• User: Access to signals, indicators, and platform features
• Mentor: Ability to create custom indicators and manage assigned users
• Admin: Platform management and oversight

3.2 Registration Requirements
• Accurate and complete registration information
• Valid email address
• Secure password (you are responsible for maintaining confidentiality)
• Payment of applicable fees

3.3 Account Responsibilities
You are responsible for:
• All activities under your account
• Maintaining the security of your login credentials
• Notifying us immediately of unauthorized access
• Ensuring your account information remains current

4. PAYMENT TERMS

4.1 Fees and Pricing
• One-Time Payment: $35 USD (subject to change)
• Payment Required: Before accessing signals and platform features
• Payment Processing: Via Stripe (secure, PCI-compliant)

4.2 No Refunds
All payments are final and non-refundable. Once payment is processed and you gain access to the platform, no refunds will be issued under any circumstances.

5. TRADING RISKS AND FINANCIAL DISCLAIMER

5.1 No Financial Advice
Mobile Indicator provides informational signals only. We do NOT:
• Provide personalized financial, investment, or trading advice
• Recommend specific trades or investment strategies
• Act as a financial advisor, broker, or investment manager
• Guarantee any financial outcomes

5.2 High-Risk Nature of Trading
TRADING FOREX, STOCKS, CRYPTOCURRENCIES, AND OTHER FINANCIAL INSTRUMENTS INVOLVES SUBSTANTIAL RISK OF LOSS.

• You may lose some or all of your invested capital
• Past performance does not indicate future results
• Signals may be delayed, incorrect, or incomplete
• Market conditions can change rapidly and unpredictably

5.3 Your Responsibility
You acknowledge:
• You understand the risks of trading
• You are solely responsible for your trading decisions
• You will not trade with funds you cannot afford to lose
• You should consult with a licensed financial advisor before trading
• You will not hold Mobile Indicator liable for any trading losses

6. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW:

The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.

MOBILE INDICATOR SHALL NOT BE LIABLE FOR:
• Trading Losses: Any losses, damages, or costs arising from your trading activities
• Direct Damages: Lost profits, revenue, or data
• Indirect Damages: Consequential, incidental, special, or punitive damages
• Service Interruptions: Downtime, bugs, errors, or signal delivery failures

TOTAL LIABILITY CAP: In no event shall our total liability exceed the amount you paid to us ($35 USD maximum).

7. INDEMNIFICATION

You agree to indemnify, defend, and hold harmless Mobile Indicator from any claims, liabilities, damages, losses, or expenses arising from:
• Your use or misuse of the App
• Your violation of these Terms
• Your trading activities and decisions
• Your violation of any laws or regulations

8. DISPUTE RESOLUTION

8.1 Arbitration Agreement
Any dispute arising from these Terms shall be resolved through binding arbitration rather than in court.

8.2 Waiver of Class Actions
YOU WAIVE THE RIGHT TO PARTICIPATE IN CLASS ACTION LAWSUITS OR CLASS-WIDE ARBITRATIONS.

9. MODIFICATIONS TO TERMS

We reserve the right to modify these Terms at any time. Changes will be posted within the App with an updated "Last Updated" date. Continued use after modifications constitutes acceptance.

10. CONTACT US

For questions or concerns regarding these Terms:

Email: mimobileindicator@gmail.com
Subject Line: Terms and Conditions Inquiry

11. ACKNOWLEDGMENT

BY USING MOBILE INDICATOR, YOU ACKNOWLEDGE THAT:

✓ You have read and understood these Terms
✓ You agree to be bound by these Terms
✓ You understand the risks of trading
✓ You will not hold Mobile Indicator liable for trading losses
✓ You are at least 18 years of age
✓ All payments are final and non-refundable
✓ You waive the right to class action lawsuits

Mobile Indicator
mimobileindicator@gmail.com
Last Updated: June 1, 2025

IMPORTANT: THESE TERMS CONTAIN A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER. PLEASE READ CAREFULLY.`,
  },
  'disclaimer': {
    title: 'Trading Risk Disclaimer',
    content: `Effective Date: June 1, 2025

⚠️ IMPORTANT WARNING: HIGH RISK OF FINANCIAL LOSS

Mobile Indicator is a trading signal platform that provides informational signals, market data, and technical analysis tools. TRADING FINANCIAL INSTRUMENTS INVOLVES SUBSTANTIAL RISK AND IS NOT SUITABLE FOR EVERYONE.

BY USING THIS APP, YOU ACKNOWLEDGE AND ACCEPT THE FOLLOWING:

1. NO FINANCIAL ADVICE

Mobile Indicator DOES NOT provide financial, investment, or trading advice.

• We are NOT financial advisors, brokers, or investment professionals
• Our signals are based on technical indicators and market analysis only
• We do NOT recommend specific trades, strategies, or investments
• All information is for educational and informational purposes only
• You should consult with a licensed financial advisor before making any trading decisions

The signals and indicators provided by Mobile Indicator are NOT personalized recommendations.

2. HIGH-RISK NATURE OF TRADING

2.1 Substantial Risk of Loss
TRADING FOREX, STOCKS, CRYPTOCURRENCIES, COMMODITIES, AND OTHER FINANCIAL INSTRUMENTS CARRIES A HIGH LEVEL OF RISK.

• You can lose SOME OR ALL of your invested capital
• Losses can exceed your initial investment, especially with leveraged trading
• Market volatility can result in rapid and significant losses
• Past performance is NOT indicative of future results

2.2 Leverage Risk
• Leveraged trading (margin trading) magnifies both gains AND losses
• Small market movements can result in large losses
• You may lose your entire account balance in a short period

2.3 Market Risk
• Markets are UNPREDICTABLE and influenced by countless factors
• Economic events, geopolitical developments, and news can cause sudden price swings
• No analysis or signal can accurately predict market movements with certainty

3. YOUR SOLE RESPONSIBILITY

YOU ARE SOLELY AND ENTIRELY RESPONSIBLE FOR:

✓ All trading decisions you make
✓ Evaluating your own financial situation and risk tolerance
✓ Conducting your own research and due diligence
✓ Understanding the instruments you trade
✓ Managing your risk and position sizes
✓ Complying with all applicable laws and regulations

Mobile Indicator provides tools and information. You make the final decisions.

4. NO GUARANTEES OR WARRANTIES

WE MAKE NO GUARANTEES REGARDING:

✗ Accuracy of Signals: Signals may be delayed, incorrect, or incomplete
✗ Profitability: No guarantee that following signals will result in profits
✗ Performance: Past signal performance does not predict future performance
✗ Uptime: The App may experience downtime, bugs, or technical issues
✗ Delivery: Signals may not be delivered due to network issues

The App is provided "AS IS" without warranties of any kind.

5. NOT SUITABLE FOR EVERYONE

Trading is NOT suitable for:
• Individuals who cannot afford to lose their investment
• Those unfamiliar with financial markets and trading concepts
• People with low risk tolerance
• Minors (under 18 years of age)

Do NOT trade with:
• Money you need for living expenses
• Borrowed funds or loans
• Retirement savings or emergency funds
• Money you cannot afford to lose entirely

6. LIMITATION OF LIABILITY

MOBILE INDICATOR SHALL NOT BE LIABLE FOR:
• Any trading losses, damages, or costs you incur
• Direct, indirect, incidental, or consequential damages
• Lost profits, revenue, or opportunities
• Damages resulting from signal errors or delays

YOU EXPRESSLY WAIVE ANY CLAIMS AGAINST MOBILE INDICATOR FOR TRADING LOSSES.

TOTAL LIABILITY CAP: Our maximum liability is limited to $35 USD.

7. INDEPENDENT DECISION-MAKING

YOU MUST:

✓ Make your own independent trading decisions
✓ Analyze signals critically and not follow them blindly
✓ Consider your personal financial situation
✓ Set stop-loss orders and manage risk appropriately
✓ Never risk more than you can afford to lose
✓ Continuously educate yourself about trading

Signals are starting points for research, not final recommendations.

8. FINAL ACKNOWLEDGMENT

BY USING MOBILE INDICATOR, YOU EXPLICITLY ACKNOWLEDGE AND AGREE THAT:

✓ You have read and understood this Disclaimer in its entirety
✓ You understand the high-risk nature of trading
✓ You accept sole responsibility for all trading decisions and outcomes
✓ You will not hold Mobile Indicator liable for any losses
✓ You are trading at your own risk
✓ You will seek professional advice before making financial decisions
✓ You waive any claims for damages against Mobile Indicator

IF YOU DO NOT AGREE WITH THIS DISCLAIMER, DO NOT USE THE APP.

⚠️ FINAL WARNING

TRADING INVOLVES SUBSTANTIAL RISK OF LOSS. ONLY TRADE WITH MONEY YOU CAN AFFORD TO LOSE. PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS. CONSULT A FINANCIAL ADVISOR BEFORE TRADING.

Mobile Indicator is a tool, not a guarantee of success. You are solely responsible for your trading outcomes.

Mobile Indicator
mimobileindicator@gmail.com
Effective Date: June 1, 2025`,
  },
  'copyright': {
    title: 'Copyright Notice',
    content: `COPYRIGHT STATEMENT

© 2025 Mobile Indicator. All Rights Reserved.

OWNERSHIP

All content, materials, features, functionality, software, algorithms, signals, indicators, text, graphics, logos, icons, images, and design of the Mobile Indicator mobile application ("the App") are the exclusive property of Mobile Indicator and are protected by:

• United States Copyright Law
• International Copyright Treaties
• Other Applicable Intellectual Property Laws

PROTECTED MATERIALS

The following materials are protected by copyright:

1. Software and Code
• Mobile application source code (frontend and backend)
• Proprietary algorithms and trading signal generation logic
• Database structures and schemas
• API endpoints and integrations

2. Visual and Design Elements
• User interface (UI) design and layout
• Graphics, icons, and illustrations
• Color schemes and visual styling
• Mobile Indicator logo and branding materials

3. Content and Data
• Trading signals (BUY/SELL/NONE)
• Custom indicators and technical analysis tools
• Market news and event notifications
• Educational materials and documentation

4. Text and Written Materials
• Terms and Conditions
• Privacy Policy
• Disclaimers and legal notices
• Marketing copy and descriptions

RESTRICTIONS ON USE

You may NOT, without prior written permission:

✗ Copy, reproduce, or duplicate any part of the App
✗ Modify, adapt, or create derivative works
✗ Distribute, publish, transmit, or sell any content
✗ Reverse engineer, decompile, or disassemble the App
✗ Remove or alter copyright notices or trademarks
✗ Use the App's content for commercial purposes
✗ Extract data or signals for redistribution

LIMITED LICENSE

By registering and paying to access Mobile Indicator, you are granted a limited, non-exclusive, non-transferable, revocable license to:

✓ Access and use the App for personal, non-commercial purposes
✓ View and use trading signals for your own trading activities
✓ Download the App on your personal devices

This license does NOT grant you any ownership rights.

TRADEMARK NOTICE

"Mobile Indicator" and the Mobile Indicator logo are trademarks of Mobile Indicator. All rights reserved.

You may not use these trademarks without prior written consent. Unauthorized use may constitute trademark infringement.

DIGITAL MILLENNIUM COPYRIGHT ACT (DMCA)

If you believe that content within Mobile Indicator infringes your copyright, please submit a DMCA notice to:

Email: mimobileindicator@gmail.com
Subject Line: DMCA Copyright Infringement Notice

Your notice must include:
1. Identification of the copyrighted work
2. Identification of the infringing material
3. Your contact information
4. A statement of good faith belief
5. A statement that the information is accurate
6. Your physical or electronic signature

ENFORCEMENT

Mobile Indicator actively monitors and enforces its copyright rights. Violations may result in:
• Immediate termination of your account
• Legal action for damages and injunctive relief
• Reporting to law enforcement
• Criminal prosecution for willful infringement

We take intellectual property infringement seriously.

CONTACT INFORMATION

For questions, permissions, or DMCA notices:

Email: mimobileindicator@gmail.com
Subject Line: Copyright Inquiry

We will respond within 10 business days.

Mobile Indicator
mimobileindicator@gmail.com
© 2025 Mobile Indicator. All Rights Reserved.

Unauthorized reproduction, distribution, or use is strictly prohibited.`,
  },
  'trademark': {
    title: 'Trademark Notice',
    content: `TRADEMARK OWNERSHIP

"Mobile Indicator" and all associated logos, designs, and branding materials are trademarks or service marks of Mobile Indicator.

© 2025 Mobile Indicator. All Rights Reserved.

PROTECTED MARKS

The following are proprietary trademarks:

1. Word Marks
• Mobile Indicator™
• MI Mobile Indicator™

2. Logos and Designs
• Mobile Indicator logo (all variations)
• App icon and visual branding elements
• Distinctive UI design features

3. Product and Service Names
• Product names, feature names, service names

TRADEMARK RIGHTS

All trademarks are protected under:
• United States Trademark Law
• State Common Law Trademark Rights
• International Trademark Treaties
• Applicable Local Trademark Laws

PROHIBITED USES

WITHOUT PRIOR WRITTEN PERMISSION, YOU MAY NOT:

✗ Use the Marks in any manner suggesting sponsorship or affiliation
✗ Incorporate the Marks into your own product names or trademarks
✗ Display the Marks on your website or marketing materials
✗ Register domain names containing "Mobile Indicator"
✗ Use the Marks in a way that disparages or dilutes the brand
✗ Alter, modify, or create derivative versions
✗ Remove or obscure trademark notices
✗ Use the Marks for commercial purposes
✗ Create "parody" or "fan" accounts

AUTHORIZED USES

You may use the Marks only in limited circumstances:

1. Nominative Fair Use
You may reference "Mobile Indicator" when:
✓ Truthfully describing the service
✓ Writing reviews or articles
✓ Providing commentary or criticism in good faith

Requirements:
• Only use the word mark (not the logo)
• Do not suggest sponsorship or endorsement
• Use only as much as necessary

2. Educational and Academic Use
You may reference the Marks in research or educational materials, provided:
✓ Use is non-commercial
✓ Does not imply endorsement
✓ Includes proper attribution

TRADEMARK INFRINGEMENT

Mobile Indicator actively monitors and enforces its trademark rights. Unauthorized use may result in:
• Cease and desist letters
• Account suspension or termination
• Legal action for damages and lost profits
• Seizure of infringing materials
• Criminal prosecution for counterfeiting

REPORTING INFRINGEMENT

If you become aware of unauthorized use:

Email: mimobileindicator@gmail.com
Subject Line: Trademark Infringement Report

Include:
• Description of the infringing use
• Location (URL, app name, etc.)
• Screenshots or evidence
• Your contact information

TRADEMARK LICENSING

To use the Mobile Indicator trademarks for commercial purposes:

Email: mimobileindicator@gmail.com
Subject Line: Trademark Licensing Inquiry

Your request should include:
• Description of intended use
• Duration and geographic scope
• Marketing materials or mockups
• Your contact information

Unauthorized use without a license constitutes infringement.

PROPER ATTRIBUTION

When referencing Mobile Indicator:

First Use: "Mobile Indicator™ is a trademark of Mobile Indicator."
Subsequent Uses: "Mobile Indicator" (no symbol required)

Do NOT use the mark as:
✗ A verb ("I Mobile Indicator'd my trades")
✗ A noun in plural form ("several Mobile Indicators")
✗ A possessive ("Mobile Indicator's signals" - use "signals from Mobile Indicator")

CONTACT INFORMATION

For trademark inquiries or licensing:

Email: mimobileindicator@gmail.com
Subject Line: Trademark Inquiry

We will respond within 10 business days.

Mobile Indicator
mimobileindicator@gmail.com
© 2025 Mobile Indicator. All Rights Reserved.

™ Trademark
® Registered Trademark (where applicable)
All trademarks are the property of their respective owners.

Unauthorized use is strictly prohibited.`,
  },
};

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document: string }>();
  const [loading, setLoading] = useState(true);

  const docData = document ? LEGAL_DOCUMENTS[document] : null;

  useEffect(() => {
    // Simulate loading for smooth transition
    setTimeout(() => setLoading(false), 300);
  }, []);

  if (!docData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Document Not Found</Text>
          <Text style={styles.errorText}>The requested legal document could not be found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#00D9FF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {docData.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D9FF" />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.documentText}>{docData.content}</Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Last Updated: June 1, 2025</Text>
            <Text style={styles.footerText}>© 2025 Mobile Indicator</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e27',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1f3a',
    borderBottomWidth: 1,
    borderBottomColor: '#00D9FF',
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,217,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  documentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#ccc',
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#00D9FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0a0e27',
    fontSize: 16,
    fontWeight: 'bold',
  },
});