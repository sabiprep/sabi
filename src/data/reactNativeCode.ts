/**
 * Sabi Expo React Native Codebase
 * High-performance, copy-paste-ready Expo/React Native TypeScript code strings for the entire SABI JAMB mobile app architecture.
 * Fully styled in the Premium Light Ice-Blue (#EBF1FA) & Cool Slate Blue (#D0E1F9) 60-30-10 dominant mobile framework.
 */

export const reactNativeOnboardingCode = `import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- THEME COLOR SPECIFICATION (Light-Blue Purity) ---
const COLORS = {
  bgIce: '#EBF1FA',          // 60% Dominant: Premium Ice Blue
  slateBlue: '#D0E1F9',      // Secondary surface accent
  navy: '#0A1128',           // 30% Secondary: Deep Authoritative Navy
  navyLight: '#1B3A7A',       // Rich Navy Blue
  gold: '#F5C518',           // 10% Accent: Emotional Highlight
  goldSoft: '#FFF3B0',       // Soft Pale Gold for glowing backgrounds
  white: '#FFFFFF',          // Crisp content surface
  grayMuted: '#9AACBF',      // Elegant spacing indicators
  border: '#D6E4F0',         // Fine layout divisions
  success: '#2E7D32',        // Deep Success Green
  warning: '#D32F2F',        // Deep Warning Red
};

export default function SabiOnboarding({ onFinish }: { onFinish: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<ScrollView | null>(null);

  // Animated scale value for buttons & interactive elements
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Slide 3 live animated counter
  const [scoreCount, setScoreCount] = useState(100);
  const animatedScore = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (currentSlide === 2) {
      animatedScore.setValue(100);
      setScoreCount(100);
      const listener = animatedScore.addListener(({ value }) => {
        setScoreCount(Math.floor(value));
      });
      Animated.timing(animatedScore, {
        toValue: 287,
        duration: 1500,
        useNativeDriver: false,
      }).start();
      return () => {
        animatedScore.removeListener(listener);
      };
    }
  }, [currentSlide]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentSlide < 2) {
      slideRef.current?.scrollTo({
        x: (currentSlide + 1) * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentSlide(currentSlide + 1);
    } else {
      onFinish();
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index !== currentSlide && index >= 0 && index <= 2) {
          setCurrentSlide(index);
        }
      }
    }
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView
        ref={slideRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        style={styles.scrollContainer}
      >
        {/* SLIDE 1: Premium Intro */}
        <View style={[styles.slide, { backgroundColor: COLORS.bgIce }]}>
          <View style={styles.blueprintGrid} />
          <View style={styles.cardWrapper}>
            <View style={styles.brandingHeader}>
              <Text style={styles.headerLogo}>SABI JAMB</Text>
              <View style={styles.goldEmbossPill}>
                <Text style={styles.goldPillText}>AI COACH</Text>
              </View>
            </View>
            <Text style={styles.title}>Crack JAMB. Own Your Future.</Text>
            <Text style={styles.subtext}>
              AI-powered test prep designed systematically for Nigerian students. We make learning stick.
            </Text>
            <View style={styles.geometricRing} />
          </View>
        </View>

        {/* SLIDE 2: Mastery Map Innovation */}
        <View style={[styles.slide, { backgroundColor: COLORS.bgIce }]}>
          <View style={styles.blueprintGrid} />
          <View style={styles.cardWrapper}>
            <Text style={styles.slideMarker}>SYSTEMATIC VISUALIZATION</Text>
            <Text style={styles.title}>See Your Weak Spots. Fix Them Fast.</Text>
            
            {/* Visual mockup of the Node Tree */}
            <View style={styles.mapGraphic}>
              <View style={styles.hairlineConnector} />
              <View style={styles.graphicRow}>
                <View style={[styles.nodeCircle, { borderColor: COLORS.success, backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.nodeValue, { color: COLORS.success }]}>82%</Text>
                </View>
                <View style={[styles.nodeCircle, { borderColor: COLORS.warning, backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.nodeValue, { color: COLORS.warning }]}>34%</Text>
                </View>
                <View style={[styles.nodeCircle, { borderColor: COLORS.navy, backgroundColor: COLORS.slateBlue }]}>
                  <Text style={[styles.nodeValue, { color: COLORS.navy }]}>50%</Text>
                </View>
              </View>
              <View style={styles.captionBox}>
                <Text style={styles.captionText}>Interconnected syllabus nodes automatically track your learning gaps</Text>
              </View>
            </View>
            
            <Text style={styles.subtext}>
              No more blind studying. Our interactive knowledge graph tells you exactly what to learn next.
            </Text>
          </View>
        </View>

        {/* SLIDE 3: Calibrated Live Predictor */}
        <View style={[styles.slide, { backgroundColor: COLORS.bgIce }]}>
          <View style={styles.blueprintGrid} />
          <View style={styles.cardWrapper}>
            <Text style={styles.slideMarker}>SCORE ALGORITHMS</Text>
            <Text style={styles.title}>Watch Your Score Climb in Real Time.</Text>

            <View style={styles.scoreContainer}>
              <View style={styles.glowingBackgroundCircle} />
              <View style={styles.scoreOuterRing}>
                <Text style={styles.jetBrainsDigit}>{scoreCount}</Text>
                <Text style={styles.scoreLabel}>Predicted Score</Text>
              </View>
            </View>

            <Text style={styles.subtext}>
              We calibrate your predicted score with every practice question answered. Your targeted 280+ is within reach.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTIONS */}
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentSlide === i ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleNext}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>
              {currentSlide === 2 ? "Let's Go →" : 'Next Screen'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  scrollContainer: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  blueprintGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(10, 17, 40, 0.03)',
    borderStyle: 'dashed',
  },
  cardWrapper: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    alignItems: 'center',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  headerLogo: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '900',
    color: '#0A1128',
  },
  goldEmbossPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFF3B0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  goldPillText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    fontWeight: '800',
    color: '#0A1128',
  },
  slideMarker: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#1B3A7A',
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: '#0A1128',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#1B3A7A',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.85,
  },
  geometricRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(245, 197, 24, 0.25)',
    marginTop: 20,
    borderStyle: 'dashed',
  },
  mapGraphic: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0E1F9',
    backgroundColor: '#F4F7FB',
    marginVertical: 20,
    position: 'relative',
    alignItems: 'center',
  },
  hairlineConnector: {
    position: 'absolute',
    top: 48,
    left: '20%',
    right: '20%',
    height: 1,
    backgroundColor: '#D6E4F0',
    zIndex: 1,
  },
  graphicRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
    zIndex: 2,
  },
  nodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    fontWeight: '800',
  },
  captionBox: {
    marginTop: 4,
  },
  captionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#4A5568',
    textAlign: 'center',
  },
  scoreContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  glowingBackgroundCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFF3B0',
    opacity: 0.5,
  },
  scoreOuterRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 6,
    borderColor: '#F5C518',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  jetBrainsDigit: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 38,
    fontWeight: '900',
    color: '#0A1128',
  },
  scoreLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#1B3A7A',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#D6E4F0',
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#F5C518',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D6E4F0',
  },
  primaryBtn: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: '#0A1128',
    fontWeight: '800',
  },
});
`;

export const reactNativeAuthCode = `import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  StatusBar,
  Dimensions,
  Modal,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CALIBRATED COLOR TOKEN SYSTEM ---
const COLORS = {
  bgIceBlue: '#EBF1FA',      // 60% Dominant Page Canvas background
  slateCool: '#D0E1F9',      // Soft auxiliary backdrop
  navyDeep: '#0A1128',       // 30% Secondary Anchor: Deep headings
  navyRich: '#1B3A7A',       // Rich border outlines & active items
  accentBlue: '#4A90D9',     // Strategic stage marker blue
  goldActive: '#F5C518',     // 10% Accent Trigger: Gold actions
  goldPale: '#FFF3B0',       // Glowing highlight background
  whitePure: '#FFFFFF',      // Flat worksheet backgrounds
  slateText: '#4A5568',      // Soft dark grey body text
  fillFaint: '#F0F4FA',      // Standard soft input fill
  borderCrisp: '#D6E4F0',    // Fine high-contrast line borders
};

export default function SabiAuthFlow({ onComplete }: { onComplete: () => void }) {
  // Navigation State: 'register' | 'otp' | 'welcome'
  const [currentStep, setCurrentStep] = useState<'register' | 'otp' | 'welcome'>('register');
  
  // Registration Fields State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secureEye, setSecureEye] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // OTP Verification Array State
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Layout Grid Background Renderer
  const renderBlueprintGrid = () => (
    <View style={styles.gridOverlay} pointerEvents="none">
      {/* Horizontal horizontal line matrix grids */}
      {Array.from({ length: Math.ceil(SCREEN_HEIGHT / 20) }).map((_, i) => (
        <View key={\`h-\${i}\`} style={[styles.gridLineH, { top: i * 20 }]} />
      ))}
      {/* Vertical grid lines */}
      {Array.from({ length: Math.ceil(SCREEN_WIDTH / 20) }).map((_, i) => (
        <View key={\`v-\${i}\`} style={[styles.gridLineV, { left: i * 20 }]} />
      ))}
    </View>
  );

  // Animated elastic spring triggers for tactile button clicks
  const scaleButtonAnim = useRef(new Animated.Value(1)).current;
  const scaleOtpAnim = useRef(new Animated.Value(1)).current;
  const scaleWelcomeAnim = useRef(new Animated.Value(1)).current;

  const triggerPressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const triggerPressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  const handleRegisterSubmit = () => {
    if (!email || !phone || !password || !agreeTerms) {
      alert('Please fill out all fields and accept the Privacy Terms.');
      return;
    }
    // Launch OTP Modal overlay
    setOtpSent(true);
    setCurrentStep('otp');
  };

  const handleOtpInput = (text: string, index: number) => {
    const val = text.replace(/[^0-9]/g, '');
    const newOtp = [...otpInput];
    newOtp[index] = val;
    setOtpInput(newOtp);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpInput[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleVerifyOtp = () => {
    const completedCode = otpInput.join('');
    if (completedCode.length === 6) {
      setCurrentStep('welcome');
    } else {
      alert('Please complete the 6 digit code');
    }
  };

  return (
    <View style={styles.outerCanvas}>
      <StatusBar barStyle="light-content" />
      {renderBlueprintGrid()}

      {/* ==================== SCREEN 1: THE REGISTRATION FORM ==================== */}
      {currentStep === 'register' && (
        <SafeAreaView style={styles.safeContainer}>
          {/* Top Bar Layout */}
          <View style={styles.topUtilityStrip}>
            <View style={styles.pillLogoFrame}>
              <View style={styles.bookIconShadow} />
              <Text style={styles.logoWhiteText}>
                Sabi <Text style={styles.logoGoldText}>JAMB</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.offlineActionPill} activeOpacity={0.8}>
              <View style={styles.shieldSymbol} />
              <Text style={styles.offlineActionLabel}>Simulate Offline</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollViewBody} contentContainerStyle={styles.scrollContentLayout} bounces={false}>
            <View style={styles.mainWorksheetCard}>
              <Text style={styles.stageIndicatorText}>STAGE 1 OF 5: FAST ENTRY</Text>
              <Text style={styles.worksheetTitleText}>Create Account</Text>
              <Text style={styles.worksheetSubtitleText}>
                We'll customize your study pathways specifically to pass your target score.
              </Text>

              {/* Input field: EMAIL ADDRESS */}
              <View style={styles.formGroupSpacer}>
                <Text style={styles.fieldHeadingLabel}>EMAIL ADDRESS</Text>
                <View style={styles.inputBorderBox}>
                  <TextInput
                    style={styles.textInputBox}
                    placeholder="e.g. tunde@gmail.com"
                    placeholderTextColor="#9AACBF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Input field: PHONE NUMBER */}
              <View style={styles.formGroupSpacer}>
                <Text style={styles.fieldHeadingLabel}>PHONE NUMBER (NIGERIAN)</Text>
                <View style={styles.phoneInputLayoutRow}>
                  <View style={styles.nigerianFlagBox}>
                    <Text style={styles.flagIconEmoji}>🇳🇬</Text>
                    <Text style={styles.countryDigitCode}>+234</Text>
                    <View style={styles.phoneVerticalDivider} />
                  </View>
                  <TextInput
                    style={styles.phoneTextInputField}
                    placeholder="8123456789"
                    placeholderTextColor="#9AACBF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Input field: PASSWORD */}
              <View style={styles.formGroupSpacer}>
                <Text style={styles.fieldHeadingLabel}>PASSWORD</Text>
                <View style={styles.passwordBorderBox}>
                  <TextInput
                    style={[styles.textInputBox, { flex: 1 }]}
                    placeholder="Create strong password"
                    placeholderTextColor="#9AACBF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureEye}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    onPress={() => setSecureEye(!secureEye)}
                    style={styles.eyeIconAlignRight}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eyeLabelIcon}>{secureEye ? '👁️' : '🕶️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compliance Terms Checkbox */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
                style={styles.checkboxComplianceRow}
              >
                <View style={[styles.squareCustomCheckbox, agreeTerms && styles.squareCheckboxChecked]}>
                  {agreeTerms && <View style={styles.checkedIndicatorDot} />}
                </View>
                <Text style={styles.checkboxLabelText}>
                  I agree to Sabi Privacy Terms and Syllabus Guidelines.
                </Text>
              </TouchableOpacity>

              {/* Action Trigger Primary Button */}
              <Animated.View style={{ transform: [{ scale: scaleButtonAnim }] }}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPressIn={() => triggerPressIn(scaleButtonAnim)}
                  onPressOut={() => triggerPressOut(scaleButtonAnim)}
                  onPress={handleRegisterSubmit}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryBtnLabelText}>REGISTER & VERIFY &gt;</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Bottom login footnote redirection link */}
              <View style={styles.bottomLinkContainer}>
                <Text style={styles.bottomRegularText}>
                  Already sitting? <Text style={styles.bottomBoldLinkText}>Login</Text>
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* ==================== SCREEN 2: THE OTP VERIFICATION OVERLAY ==================== */}
      <Modal visible={currentStep === 'otp'} transparent animationType="fade">
        <View style={styles.modalSemiAmbientLayer}>
          <View style={styles.centralModalSheetCard}>
            {/* Close Button X */}
            <TouchableOpacity 
              onPress={() => setCurrentStep('register')}
              style={styles.modalXCloseButton}
              activeOpacity={0.7}
            >
              <Text style={styles.closeXGlyph}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitleText}>Enter Verification Code</Text>
            <Text style={styles.modalDescriptionText}>
              We sent a 6-digit verification code to your device.
            </Text>

            {/* Code Input Array row */}
            <View style={styles.otpGridInputRow}>
              {Array.from({ length: 6 }).map((_, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <TextInput
                    key={\`otp-\${idx}\`}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    style={[
                      styles.individualOtpBox,
                      isFocused && styles.individualOtpBoxFocused,
                      otpInput[idx] !== '' && styles.individualOtpBoxFilled
                    ]}
                    value={otpInput[idx]}
                    onChangeText={(text) => handleOtpInput(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    onFocus={() => setFocusedIndex(idx)}
                  />
                );
              })}
            </View>

            {/* Modal Primary Action Confirm Button */}
            <Animated.View style={{ transform: [{ scale: scaleOtpAnim }] }}>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPressIn={() => triggerPressIn(scaleOtpAnim)}
                onPressOut={() => triggerPressOut(scaleOtpAnim)}
                onPress={handleVerifyOtp}
                activeOpacity={0.9}
              >
                <Text style={styles.modalConfirmLabelText}>CONFIRM CODE</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Didn't get code link footnote */}
            <View style={styles.modalResendFootnote}>
              <Text style={styles.bottomRegularText}>
                Didn't get a code? <Text style={styles.bottomBoldLinkText}>Resend SMS</Text>
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== SCREEN 3: WELCOME CONFIGURED GATEWAY ==================== */}
      {currentStep === 'welcome' && (
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.welcomeOuterLayout}>
            <View style={styles.welcomeFloaterCard}>
              
              {/* Top LinearGradient-styled Graphic Capsule */}
              <LinearGradient 
                colors={['#0A1128', '#1B3A7A']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.styledTopGraphicCapsuleBlue}
              >
                <Text style={styles.welcomeCapsuleTitleText}>WELCOME ONBOARD</Text>
                <Text style={styles.welcomeCapsuleSublabel}>Sabi adaptive pathways configured</Text>
              </LinearGradient>

              {/* Classroom Illustration Placeholder Block */}
              <View style={styles.visualClassroomCardFrame}>
                <View style={styles.classroomIconBadgeOrb}>
                  <Text style={styles.classroomGlobeEmoji}>🌍</Text>
                </View>
                <Text style={styles.classroomReferenceLabel}>Nigeria Aspirants Classroom</Text>
              </View>

              {/* Core bold headlines and description layouts */}
              <View style={styles.welcomeDetailScopeBox}>
                <Text style={styles.focusHeadlineText}>Crack JAMB. Own Your Future.</Text>
                
                <Text style={styles.welcomeExplanatorySubtextLarge}>
                  We are going to ask you <Text style={styles.welcomeHeavyEmphasizedText}>exactly 15 quick questions</Text> to build your personalized <Text style={styles.welcomeHeavyEmphasizedText}>Mastery Map</Text>. No empty profiles, only high morale!
                </Text>
              </View>

              {/* Get Started Gold trigger button with 3D shadow style */}
              <Animated.View style={{ transform: [{ scale: scaleWelcomeAnim }], marginTop: 20 }}>
                <TouchableOpacity
                  style={styles.welcomeGetStartedButton3D}
                  onPressIn={() => triggerPressIn(scaleWelcomeAnim)}
                  onPressOut={() => triggerPressOut(scaleWelcomeAnim)}
                  onPress={onComplete}
                  activeOpacity={0.9}
                >
                  <Text style={styles.welcomeBtnTextMark}>GET STARTED &gt;</Text>
                </TouchableOpacity>
              </Animated.View>

            </View>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// --- CENTRALIZED STYLE ENGINE RULES ---
const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: '#EBF1FA',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    opacity: 0.03, // lowered opacity for elegant blueprint feel
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#0A1128',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#0A1128',
  },
  safeContainer: {
    flex: 1,
    zIndex: 10,
  },
  topUtilityStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0A1128',
  },
  pillLogoFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: '#F5C518',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bookIconShadow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F5C518',
    marginRight: 6,
  },
  logoWhiteText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoGoldText: {
    color: '#F5C518',
    fontWeight: '900',
  },
  offlineActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },
  shieldSymbol: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  offlineActionLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#FFFFFF',
  },
  scrollViewBody: {
    flex: 1,
  },
  scrollContentLayout: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 0,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  mainWorksheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: '#D6E4F0',
    padding: 24,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    marginTop: 20,
    minHeight: SCREEN_HEIGHT - 120, // covers rest of screen
  },
  stageIndicatorText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#4A90D9',
    textAlign: 'center',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  worksheetTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    fontWeight: '900',
    color: '#0A1128',
    textAlign: 'center',
    marginBottom: 10,
  },
  worksheetSubtitleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  formGroupSpacer: {
    marginBottom: 14,
  },
  fieldHeadingLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#0A1128',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputBorderBox: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    backgroundColor: '#F0F4FA',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  textInputBox: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#0A1128',
    padding: 0,
  },
  phoneInputLayoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    backgroundColor: '#F0F4FA',
    overflow: 'hidden',
  },
  nigerianFlagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#E6EDF5',
    height: '100%',
  },
  flagIconEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  countryDigitCode: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#0A1128',
  },
  phoneVerticalDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
    marginLeft: 10,
  },
  phoneTextInputField: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#0A1128',
    paddingHorizontal: 12,
  },
  passwordBorderBox: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    backgroundColor: '#F0F4FA',
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyeIconAlignRight: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
  },
  eyeLabelIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  checkboxComplianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    gap: 10,
  },
  squareCustomCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#1B3A7A',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareCheckboxChecked: {
    backgroundColor: '#0A1128',
    borderColor: '#0A1128',
  },
  checkedIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5C518',
  },
  checkboxLabelText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 16,
  },
  primaryActionButton: {
    height: 52,
    backgroundColor: '#F5C518',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A1128',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnLabelText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#0A1128',
  },
  bottomLinkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  bottomRegularText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#4A5568',
  },
  bottomBoldLinkText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#0A1128',
  },

  // Modal layouts (Overlay Screen 2)
  modalSemiAmbientLayer: {
    flex: 1,
    backgroundColor: 'rgba(10, 17, 40, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  centralModalSheetCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D6E4F0',
    padding: 24,
    position: 'relative',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalXCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  closeXGlyph: {
    fontSize: 12,
    color: '#1B3A7A',
    fontWeight: '800',
  },
  modalStageMarker: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12, // requested size
    fontWeight: '800',
    color: '#4A90D9',
    textAlign: 'center',
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  modalTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22, // requested size
    fontWeight: '900',
    color: '#0A1128',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
  },
  highlightMonoCode: {
    fontFamily: 'JetBrainsMono-Bold',
    color: '#0A1128',
    fontWeight: '700',
  },
  otpGridInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 24,
  },
  individualOtpBox: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D6E4F0',
    backgroundColor: '#F0F4FA',
    textAlign: 'center',
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#0A1128',
  },
  individualOtpBoxFocused: {
    borderColor: '#1B3A7A',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  individualOtpBoxFilled: {
    borderColor: '#4A90D9',
  },
  modalConfirmButton: {
    height: 48,
    backgroundColor: '#F5C518',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A1128',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  modalConfirmLabelText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
  },
  modalResendFootnote: {
    marginTop: 16,
    alignItems: 'center',
  },

  // Screen 3: Welcome Configured Gateway
  welcomeOuterLayout: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  welcomeFloaterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#D6E4F0',
    padding: 20,
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  styledTopGraphicCapsuleBlue: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1B3A7A',
  },
  welcomeCapsuleTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  welcomeCapsuleSublabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#D0E1F9',
    marginTop: 3,
  },
  visualClassroomCardFrame: {
    backgroundColor: '#F4F7FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  classroomIconBadgeOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classroomGlobeEmoji: {
    fontSize: 16,
  },
  classroomReferenceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: '700',
    color: '#1B3A7A',
  },
  welcomeDetailScopeBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  focusHeadlineText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '900',
    color: '#0A1128',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeExplanatorySubtextLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#4A5568',
    textAlign: 'center',
  },
  welcomeHeavyEmphasizedText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#0A1128',
  },
  welcomeGetStartedButton3D: {
    height: 52,
    backgroundColor: '#F5C518',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A1128',
    // 3D physical layout shadow offsets
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeBtnTextMark: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '900',
    color: '#0A1128',
  },
});
`;

export const reactNativeDashboardCode = `import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar
} from 'react-native';

export default function SabiDashboard({ onNav }: { onNav: (tab: string) => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* SWEEPING GRADIENT HERO */}
      <View style={styles.heroSection}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greetingText}>Welcome back, Aspirant!</Text>
            <Text style={styles.targetMark}>Target: 290+ • LABC Squad</Text>
          </View>
          <View style={styles.timelineBadge}>
            <Text style={styles.timelineText}>25 DAYS TO UTME</Text>
          </View>
        </View>

        {/* Central visual Ring */}
        <View style={styles.scoreDialContainer}>
          <View style={styles.concentricOuterLine} />
          <View style={styles.dialValues}>
            <Text style={styles.jetbrainsBigScore}>312</Text>
            <Text style={styles.predictedScoreDesc}>SABI PROJECTED SCORE</Text>
          </View>
          <View style={styles.ptsGainTag}>
            <Text style={styles.ptsGainLabel}>+12 PTS TODAY ↑</Text>
          </View>
        </View>
      </View>

      {/* OVERLAPPING STREAK CARD */}
      <View style={styles.streakContainer}>
        <View style={styles.streakCard}>
          <View style={styles.streakIconRow}>
            <Text style={styles.emojiFire}>🔥</Text>
            <View style={styles.streakDetails}>
              <Text style={styles.streakValueText}>7-Day Streak Achieved!</Text>
              <Text style={styles.streakSub}>Keep practicing daily to prevent status memory decay.</Text>
            </View>
          </View>
          {/* Streak matrix capsules */}
          <View style={styles.streakMatrix}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <View key={idx} style={styles.streakDayColumn}>
                <View style={[styles.dayCapsule, idx < 5 ? styles.dayCapsuleActive : styles.dayCapsuleInactive]} />
                <Text style={styles.dayText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <ScrollView style={styles.feedScroll} contentContainerStyle={styles.feedContent}>
        
        {/* QUICK STATS GRAPH MATRIX */}
        <View style={styles.statsMatrixGrid}>
          {/* STAT CARD 1 */}
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>180</Text>
            <Text style={styles.statTitle}>Questions Answered</Text>
          </View>
          {/* STAT CARD 2 */}
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2E7D32' }]}>81%</Text>
            <Text style={styles.statTitle}>Weekly Accuracy</Text>
          </View>
          {/* STAT CARD 3 */}
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2196F3' }]}>12</Text>
            <Text style={styles.statTitle}>Syllabus Units Mastered</Text>
          </View>
        </View>

        {/* HORIZONTAL SUBJECTS ROLL */}
        <Text style={styles.sectionHeading}>Your Registered UTME Subjects</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll} contentContainerStyle={styles.subjectScrollContent}>
          {[
            { subject: 'Mathematics', progress: '78%', accuracy: '82%', color: '#F5C518' },
            { subject: 'English Language', progress: '61%', accuracy: '74%', color: '#1B3A7A' },
            { subject: 'Physics', progress: '42%', accuracy: '62%', color: '#D32F2F' },
            { subject: 'Chemistry', progress: '30%', accuracy: '55%', color: '#9747FF' }
          ].map((item) => (
            <TouchableOpacity key={item.subject} style={styles.subjectGridCard} activeOpacity={0.9}>
              <View style={[styles.masteryBarLeft, { backgroundColor: item.color }]} />
              <Text style={styles.subCardTitle}>{item.subject}</Text>
              <View style={styles.metricsFlexRow}>
                <View>
                  <Text style={styles.subCardMetricTitle}>MASTERY</Text>
                  <Text style={styles.subCardMetricValue}>{item.progress}</Text>
                </View>
                <View>
                  <Text style={styles.subCardMetricTitle}>ACCURACY</Text>
                  <Text style={styles.subCardMetricValue}>{item.accuracy}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* WEEKLY STUDY PLAN ANCHOR CARD */}
        <View style={styles.studyPlanAnchorCard}>
          <View style={styles.studyPlanNavyLine} />
          <View style={styles.studyPlanBody}>
            <Text style={styles.studyPlanTitle}>TODAY'S STRATEGIC TASKS</Text>
            <View style={styles.taskLineItem}>
              <View style={styles.customBulletOrb} />
              <Text style={styles.taskLabelText}>Solve 10 Physics Mechanics equations</Text>
            </View>
            <View style={styles.taskLineItem}>
              <View style={styles.customBulletOrb} />
              <Text style={styles.taskLabelText}>Review English Grammar: Concord rules</Text>
            </View>

            <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => onNav('practice')}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.planCTA}
                activeOpacity={0.9}
              >
                <Text style={styles.planCTALabel}>Start Session →</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

      </ScrollView>

      {/* STATIC BOTTOM NAVIGATION BAR */}
      <View style={styles.baselineDock}>
        {[
          { icon: '🏠', id: 'home', label: 'Home' },
          { icon: '📝', id: 'practice', label: 'Practice' },
          { icon: '🗺️', id: 'mastery', label: 'Mastery' },
          { icon: '🏆', id: 'leaderboard', label: 'Squad' },
          { icon: '👤', id: 'profile', label: 'Profile' }
        ].map((item) => {
          const isActive = item.id === 'home';
          return (
            <TouchableOpacity key={item.id} onPress={() => onNav(item.id)} style={styles.dockButton} activeOpacity={0.8}>
              <Text style={[styles.dockIcon, { opacity: isActive ? 1 : 0.6 }]}>{item.icon}</Text>
              <Text style={[styles.dockLabel, { color: isActive ? '#F5C518' : '#9AACBF' }]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeGoldUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  heroSection: {
    backgroundColor: '#0A1128',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 70,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  targetMark: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#D0E1F9',
    opacity: 0.8,
  },
  timelineBadge: {
    backgroundColor: 'rgba(245, 197, 24, 0.1)',
    borderWidth: 1,
    borderColor: '#F5C518',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timelineText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    color: '#F5C518',
    fontWeight: '800',
  },
  scoreDialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    position: 'relative',
  },
  concentricOuterLine: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  dialValues: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  jetbrainsBigScore: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 54,
    fontWeight: '900',
    color: '#F5C518',
  },
  predictedScoreDesc: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  ptsGainTag: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    position: 'absolute',
    bottom: -24,
  },
  ptsGainLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#FFF3B0',
    fontWeight: '800',
  },
  streakContainer: {
    marginHorizontal: 16,
    marginTop: -40,
    zIndex: 10,
  },
  streakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  streakIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiFire: {
    fontSize: 28,
  },
  streakDetails: {
    flex: 1,
  },
  streakValueText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: '#0A1128',
    fontWeight: '800',
  },
  streakSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  streakMatrix: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4FA',
  },
  streakDayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  dayCapsule: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dayCapsuleActive: {
    backgroundColor: '#F5C518',
  },
  dayCapsuleInactive: {
    backgroundColor: '#E2E8F0',
  },
  dayText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#9AACBF',
    fontWeight: '700',
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingVertical: 20,
    paddingBottom: 80,
  },
  statsMatrixGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#0369A1',
  },
  statTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    color: '#1B3A7A',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
  sectionHeading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#0A1128',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  subjectScroll: {
    paddingLeft: 16,
  },
  subjectScrollContent: {
    paddingRight: 24,
    gap: 12,
  },
  subjectGridCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D0E1F9',
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  masteryBarLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  subCardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
    marginBottom: 14,
  },
  metricsFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subCardMetricTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    color: '#9AACBF',
    letterSpacing: 0.5,
  },
  subCardMetricValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#1B3A7A',
  },
  studyPlanAnchorCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  studyPlanNavyLine: {
    width: 6,
    backgroundColor: '#1B3A7A',
  },
  studyPlanBody: {
    flex: 1,
    padding: 16,
  },
  studyPlanTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#1B3A7A',
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 10,
  },
  taskLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  customBulletOrb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  taskLabelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#0A1128',
  },
  planCTA: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5C518',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planCTALabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#0A1128',
    fontWeight: '900',
  },
  baselineDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#0A1128',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dockButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dockIcon: {
    fontSize: 18,
  },
  dockLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 2,
  },
  activeGoldUnderline: {
    position: 'absolute',
    bottom: -6,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#F5C518',
    borderRadius: 2,
  },
});
`;

export const reactNativePracticeCode = `import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_QUESTION = {
  id: 'CHM-2019-Q15',
  source: 'JAMB CHEMISTRY 2019',
  question: 'What is the empirical formula of a compound containing 40.0% Carbon, 6.7% Hydrogen, and 53.3% Oxygen? [Take atomic masses: C=12, H=1, O=16]',
  options: {
    A: '$CH_2O$',
    B: '$CHO$',
    C: '$C_2H_4O$',
    D: '$CH_3O$'
  },
  correctAnswer: 'A',
  explanation: 'Find moles of each element in 100g:\\nCarbon: $40.0 / 12 = 3.33$ moles\\nHydrogen: $6.7 / 1 = 6.7$ moles\\nOxygen: $53.3 / 16 = 3.33$ moles\\nDivide by smallest mole value (3.33) to get ratio: C=1, H=2, O=1 \\\\implies CH_2O.'
};

export default function SabiPractice({ onSessionFinish }: { onSessionFinish: () => void }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes

  const bounceAnims = {
    A: useRef(new Animated.Value(1)).current,
    B: useRef(new Animated.Value(1)).current,
    C: useRef(new Animated.Value(1)).current,
    D: useRef(new Animated.Value(1)).current,
  };

  // AI Bottom-drawer offset
  const aiSheetOffset = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [aiExpanded, setAiExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
  };

  const getTimerColor = () => {
    if (timeLeft > 60) return '#2E7D32'; // Green
    if (timeLeft > 30) return '#F5C518'; // Orange/Gold
    return '#D32F2F'; // Red
  };

  const selectOption = (opt: string) => {
    if (isVerified) return;
    setSelectedOption(opt);
    
    // Tiny bounce feedback on option card select
    const anim = (bounceAnims as any)[opt];
    if (anim) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1.0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  };

  const verifyAnswer = () => {
    if (!selectedOption) return;
    setIsVerified(true);
    
    // Automatically lift bottom AI drawer slightly
    Animated.spring(aiSheetOffset, {
      toValue: SCREEN_HEIGHT - 380,
      tension: 30,
      friction: 8,
      useNativeDriver: true,
    }).start();
    setAiExpanded(true);
  };

  const closeAiDrawer = () => {
    Animated.timing(aiSheetOffset, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setAiExpanded(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP TIMELINE PROGRESS & SYSTEM COG */}
      <View style={styles.headerBar}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '40%' }]} />
        </View>
        <Text style={styles.headerTitle}>CHALLENGE 3 OF 10</Text>
        <Text style={[styles.timerDigit, { color: getTimerColor() }]}>{formatTimer()}</Text>
      </View>

      <ScrollView style={styles.workspaceScroll} contentContainerStyle={styles.workspaceBody}>
        {/* PREMIUM FLAT UNTEXTURED WORKPLACE */}
        <View style={styles.questionCard}>
          <View style={styles.contextBadgeBox}>
            <Text style={styles.contextBadgeText}>{MOCK_QUESTION.source} • ID: {MOCK_QUESTION.id}</Text>
          </View>
          <Text style={styles.questionText}>{MOCK_QUESTION.question}</Text>
        </View>

        {/* INTERACTION OPTIONS SECTION */}
        <View style={styles.choicesWrapper}>
          {Object.entries(MOCK_QUESTION.options).map(([key, value]) => {
            const isSel = selectedOption === key;
            const isCorrect = key === MOCK_QUESTION.correctAnswer;
            
            // Visual dynamic conditions based on selection states
            let cardStyle = styles.optionCardFlat;
            let textStyle = styles.optionCardTextFlat;

            if (isSel && !isVerified) {
              cardStyle = styles.optionCardSelected;
              textStyle = styles.optionCardTextSelected;
            } else if (isVerified) {
              if (isCorrect) {
                cardStyle = styles.optionCardCorrect;
                textStyle = styles.optionCardTextCorrect;
              } else if (isSel) {
                cardStyle = styles.optionCardWrong;
                textStyle = styles.optionCardTextWrong;
              } else {
                cardStyle = styles.optionCardMuted;
              }
            }

            return (
              <Animated.View
                key={key}
                style={{ transform: [{ scale: (bounceAnims as any)[key] }] }}
              >
                <TouchableOpacity
                  onPress={() => selectOption(key)}
                  activeOpacity={0.88}
                  style={cardStyle}
                >
                  <View style={[
                    styles.indexCircle,
                    isSel ? { backgroundColor: COLORS.gold, borderColor: COLORS.navy } : { backgroundColor: '#F0F4FA', borderColor: '#D6E4F0' }
                  ]}>
                    <Text style={styles.indexCircleText}>{key}</Text>
                  </View>
                  <Text style={[styles.choiceStringText, textStyle]}>{value}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Action button */}
        {!isVerified ? (
          <TouchableOpacity
            onPress={verifyAnswer}
            disabled={!selectedOption}
            style={[styles.actionBtn, !selectedOption && { opacity: 0.5 }]}
          >
            <Text style={styles.actionBtnLabel}>SUBMIT ANSWER & RUN AI COACH</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onSessionFinish}
            style={[styles.actionBtn, { backgroundColor: '#0A1128' }]}
          >
            <Text style={[styles.actionBtnLabel, { color: '#FFFFFF' }]}>CONTINUE TO NEXT CHALLENGE</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* AI BOTTOM DRAWER PORTAL */}
      <Animated.View style={[styles.aiDrawer, { transform: [{ translateY: aiSheetOffset }] }]}>
        <View style={styles.drawerHandleBar}>
          <TouchableOpacity onPress={closeAiDrawer} style={styles.pullHandle} />
        </View>
        <View style={styles.drawerHeader}>
          <Text style={styles.aiBadgeText}>🤖 SABI AI COACH EXPLORER</Text>
          <TouchableOpacity onPress={closeAiDrawer}>
            <Text style={styles.closeBtnText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerContent}>
          <Text style={styles.explainHeading}>Worked Step-by-Step Explanation:</Text>
          <Text style={styles.explainParagraph}>{MOCK_QUESTION.explanation}</Text>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const COLORS = {
  navy: '#0A1128',
  gold: '#F5C518',
  success: '#2E7D32',
  warning: '#D32F2F',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  headerBar: {
    backgroundColor: '#0A1128',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  progressBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F5C518',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: '#9AACBF',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  timerDigit: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  workspaceScroll: {
    flex: 1,
  },
  workspaceBody: {
    padding: 16,
    paddingBottom: 60,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    shadowColor: '#0A1128',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  contextBadgeBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF1FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  contextBadgeText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#1B3A7A',
    fontWeight: '700',
  },
  questionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    fontWeight: '700',
    color: '#0A1128',
    lineHeight: 22,
  },
  choicesWrapper: {
    gap: 10,
    marginVertical: 20,
  },
  optionCardFlat: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D0E1F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardSelected: {
    backgroundColor: '#0A1128',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#0A1128',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardCorrect: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardWrong: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionCardMuted: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.6,
  },
  indexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexCircleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: '#0A1128',
    fontWeight: '800',
  },
  choiceStringText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  optionCardTextFlat: {
    color: '#0A1128',
  },
  optionCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  optionCardTextCorrect: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  optionCardTextWrong: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  actionBtn: {
    height: 50,
    backgroundColor: '#F5C518',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D2149',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 10,
  },
  actionBtnLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#0A1128',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  aiDrawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 380,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    padding: 16,
  },
  drawerHandleBar: {
    alignItems: 'center',
    marginBottom: 10,
  },
  pullHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4FA',
    paddingBottom: 10,
  },
  aiBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#0A1128',
    fontWeight: '800',
  },
  closeBtnText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '700',
  },
  drawerScroll: {
    flex: 1,
    marginTop: 12,
  },
  drawerContent: {
    paddingBottom: 24,
  },
  explainHeading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: '#1B3A7A',
    fontWeight: '800',
    marginBottom: 6,
  },
  explainParagraph: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 20,
  },
});
`;

export const reactNativeMasteryCode = `import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';

const SUBJECTS = ['Mathematics', 'English Language', 'Physics', 'Chemistry'];

const TOPICS_DRAFT = [
  { id: '1', title: 'Matrices & Determinants', accuracy: 82, weight: 'High', status: 'mastered' },
  { id: '2', title: 'Linear Equations', accuracy: 55, weight: 'Medium', status: 'inprogress' },
  { id: '3', title: 'Indices & Surds', accuracy: 22, weight: 'High', status: 'weak' },
  { id: '4', title: 'Differential Calculus', accuracy: 0, weight: 'Low', status: 'unattempted' }
];

export default function SabiMasteryMap({ onNavPractice }: { onNavPractice: (topic: string) => void }) {
  const [activeSubject, setActiveSubject] = useState('Mathematics');
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'mastered': return '#2E7D32'; // Gold rim is added in border
      case 'inprogress': return '#2196F3';
      case 'weak': return '#D32F2F';
      default: return '#9AACBF';
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />

      {/* HORIZONTAL SUBJECT BAR */}
      <View style={styles.scrollerContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
          {SUBJECTS.map((subject) => {
            const isSel = subject === activeSubject;
            return (
              <TouchableOpacity
                key={subject}
                onPress={() => setActiveSubject(subject)}
                style={[styles.subjectChip, isSel ? styles.subjectChipActive : styles.subjectChipInactive]}
              >
                <Text style={[styles.subjectChipText, isSel ? styles.subjectChipTextActive : styles.subjectChipTextInactive]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TOPOLOGICAL GRAPH NETWORK */}
      <View style={styles.graphWrapper}>
        <View style={styles.graphPaperBg} />
        
        <ScrollView contentContainerStyle={styles.nodesGraphCanvas}>
          <Text style={styles.canvasNotice}>MAP OF ACADEMIC TOPICS LINKAGES</Text>
          
          <View style={styles.nodesContainer}>
            {TOPICS_DRAFT.map((item, index) => {
              const nodeColor = getNodeColor(item.status);
              const isSelected = selectedNode?.id === item.id;
              
              return (
                <View key={item.id} style={styles.coordinateNodeRow}>
                  {index > 0 && <View style={styles.segmentLinkLine} />}
                  
                  <TouchableOpacity
                    onPress={() => setSelectedNode(item)}
                    activeOpacity={0.8}
                    style={[
                      styles.graphNodeCircle,
                      { borderColor: nodeColor },
                      item.status === 'unattempted' && { borderStyle: 'dashed' },
                      isSelected && { borderWidth: 4, transform: [{ scale: 1.1 }] }
                    ]}
                  >
                    <Text style={[styles.nodeValueTag, { color: nodeColor }]}>
                      {item.status === 'unattempted' ? '?' : \`\${item.accuracy}%\`}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.nodeRefTitle}>{item.title}</Text>
                  <Text style={styles.nodeWeightBadge}>Weight: {item.weight}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* DETAIL CONTEXT DRAWER SHEET */}
      {selectedNode && (
        <View style={styles.drawerSheet}>
          <View style={styles.drawerFlexRow}>
            <View>
              <Text style={styles.sheetHeader}>{selectedNode.title}</Text>
              <Text style={styles.sheetSub}>UTME Exam weight: {selectedNode.weight} Priority</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNode(null)} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sheetDataRow}>
            <View style={styles.sheetMetric}>
              <Text style={styles.sheetMetricLabel}>Accuracy Level</Text>
              <Text style={[styles.sheetValue, { color: getNodeColor(selectedNode.status) }]}>
                {selectedNode.status === 'unattempted' ? 'No history' : \`\${selectedNode.accuracy}%\`}
              </Text>
            </View>
            <View style={styles.sheetMetric}>
              <Text style={styles.sheetMetricLabel}>Topic Priority</Text>
              <Text style={styles.sheetValueHighlight}>RE-CALIBRATE</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onNavPractice(selectedNode.title)}
            style={styles.sheetCTA}
          >
            <Text style={styles.ctaLabelText}>FOCUS STUDY THIS TOPIC</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  scrollerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#D6E4F0',
    paddingVertical: 10,
  },
  subjectRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectChipInactive: {
    backgroundColor: '#FFF',
    borderColor: '#D6E4F0',
  },
  subjectChipActive: {
    backgroundColor: '#0A1128',
    borderColor: '#0A1128',
  },
  subjectChipText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '700',
  },
  subjectChipTextInactive: {
    color: '#1B3A7A',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
  },
  graphWrapper: {
    flex: 1,
    position: 'relative',
  },
  graphPaperBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EBF1FA',
    borderWidth: 1,
    borderColor: '#D0E1F9',
    opacity: 0.1,
  },
  nodesGraphCanvas: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  canvasNotice: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    color: '#1B3A7A',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 24,
  },
  nodesContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  coordinateNodeRow: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
    position: 'relative',
  },
  segmentLinkLine: {
    position: 'absolute',
    top: -30,
    width: 2,
    height: 30,
    backgroundColor: '#D6E4F0',
    zIndex: 1,
  },
  graphNodeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nodeValueTag: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 13,
    fontWeight: '800',
  },
  nodeRefTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
    marginTop: 8,
  },
  nodeWeightBadge: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#4A5568',
    marginTop: 2,
    backgroundColor: '#D0E1F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  drawerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetHeader: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '800',
    color: '#0A1128',
  },
  sheetSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#4A5568',
    marginTop: 2,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 11,
    color: '#1B3A7A',
  },
  sheetDataRow: {
    flexDirection: 'row',
    marginVertical: 16,
    gap: 16,
  },
  sheetMetric: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D6E4F0',
  },
  sheetMetricLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#9AACBF',
  },
  sheetValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  sheetValueHighlight: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '800',
    color: '#F5C518',
    marginTop: 4,
  },
  sheetCTA: {
    height: 48,
    backgroundColor: '#0A1128',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabelText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
`;

export const reactNativePredictorCode = `import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar
} from 'react-native';

export default function SabiScorePredictor() {
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />

      {/* GRADIENT SPEEDOMETER HERO */}
      <View style={styles.speedometerHero}>
        <Text style={styles.heroPreTitle}>FORECAST METRIC</Text>
        
        {/* Mock detailed arc speedometer gauge */}
        <View style={styles.speedometerGauge}>
          <View style={styles.concentricSemicircleRing} />
          <View style={styles.arrowPointer} />
          <View style={styles.scoreTextBox}>
            <Text style={styles.numericGoldScore}>312</Text>
            <Text style={styles.confidenceLabel}>92% CALIBRATION LEVEL</Text>
          </View>
        </View>

        <Text style={styles.heroSubLabel}>Sabi AI Score Prognosis calibrated with 140 practice metrics</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* POINT GAP STRATEGIC RESOLUTION DIRECTIVES */}
        <View style={styles.pointGapCard}>
          <Text style={styles.pointGapHeading}>Target Gap Progress</Text>
          <View style={styles.gapBanner}>
            <Text style={styles.gapEmoji}>🎯</Text>
            <Text style={styles.gapMessage}>You need +34 more points to lock in admission for Medicine at UI.</Text>
          </View>
          <Text style={styles.recommendationDesc}>HIGH-VALUED SYLLABUS GAPS GIVING MAXIMUM POINTS INCREASES:</Text>
          <View style={styles.pillContainer}>
            <View style={styles.topicPillblue}>
              <Text style={styles.pillLabel}>Concord Rules (+15 pts)</Text>
            </View>
            <View style={styles.topicPillblue}>
              <Text style={styles.pillLabel}>Electromagnetism (+12 pts)</Text>
            </View>
          </View>
        </View>

        {/* METRIC CONTRIBUTION DECK */}
        <Text style={styles.sectionTitle}>Syllabus Contribution levels</Text>
        <View style={styles.contributionDeck}>
          {[
            { subj: 'Mathematics', value: 81, color: '#2E7D32' },
            { subj: 'English Language', value: 65, color: '#1B3A7A' },
            { subj: 'Physics', value: 42, color: '#D32F2F' }
          ].map((item) => (
            <View key={item.subj} style={styles.contributionCard}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.subjTextName}>{item.subj}</Text>
                <Text style={styles.subjAccuracyValue}>{item.value}% Accuracy</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: \`\${item.value}%\`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* 14-DAY CALIBRATED TIMELINE GRAPH */}
        <Text style={styles.sectionTitle}>Calibrated score progression (14 Days)</Text>
        <View style={styles.chartMatrixCard}>
          <View style={styles.chartYGridRow} />
          <View style={styles.chartYGridRow} />
          <View style={styles.chartYGridRow} />
          
          {/* Simulated clean polyline vector */}
          <View style={styles.simulatedChartLine} />
          <View style={styles.daysLabelsRow}>
            {['D1', 'D3', 'D5', 'D7', 'D9', 'D12', 'D14'].map((day) => (
              <Text key={day} style={styles.axisLabelText}>{day}</Text>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  speedometerHero: {
    backgroundColor: '#0A1128',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroPreTitle: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#9AACBF',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },
  speedometerGauge: {
    width: 200,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  concentricSemicircleRing: {
    position: 'absolute',
    top: 10,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#F5C518',
    borderStyle: 'dashed',
  },
  arrowPointer: {
    position: 'absolute',
    bottom: 0,
    left: '42%',
    width: 32,
    height: 4,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  scoreTextBox: {
    alignItems: 'center',
    marginBottom: 10,
  },
  numericGoldScore: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 48,
    fontWeight: '950',
    color: '#F5C518',
  },
  confidenceLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  heroSubLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#D0E1F9',
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pointGapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  pointGapHeading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
  },
  gapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF1FA',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  gapEmoji: {
    fontSize: 18,
  },
  gapMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#1B3A7A',
    flex: 1,
    fontWeight: '700',
  },
  recommendationDesc: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 8,
    color: '#9AACBF',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicPillblue: {
    backgroundColor: '#D0E1F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#0A1128',
    fontWeight: '700',
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#0A1128',
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  contributionDeck: {
    gap: 10,
  },
  contributionCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E4F0',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjTextName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
  },
  subjAccuracyValue: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    color: '#1B3A7A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F0F4FA',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  chartMatrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    padding: 16,
    position: 'relative',
    height: 140,
    justifyContent: 'space-between',
  },
  chartYGridRow: {
    height: 1,
    backgroundColor: '#F0F4FA',
    width: '100%',
  },
  simulatedChartLine: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1B3A7A',
    opacity: 0.7,
  },
  daysLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  axisLabelText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#9AACBF',
  },
});
`;

export const reactNativeLeaderboardCode = `import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';

const MOCK_RANKING = [
  { rank: 1, name: 'Grace Adebayo', score: 345, badge: '🥇' },
  { rank: 2, name: 'Chinedu Joseph', score: 328, badge: '🥈' },
  { rank: 3, name: 'Mustapha Kabir', score: 318, badge: '🥉' },
  { rank: 4, name: 'Ibrahim Bala', score: 300, badge: '' },
  { rank: 5, name: 'Aspirant (You)', score: 287, badge: '', isMe: true },
  { rank: 6, name: 'Sarah Peters', score: 275, badge: '' }
];

export default function SabiLeaderboard() {
  const [filter, setFilter] = useState<'weekly' | 'alltime'>('weekly');

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" />

      {/* TOP DEEP NAVY TAB CONTROLLER */}
      <View style={styles.leaderboardNavyHeader}>
        <Text style={styles.headerLabel}>SABI SQUAD STANDINGS</Text>
        
        <View style={styles.tabBarFlex}>
          <TouchableOpacity onPress={() => setFilter('weekly')} style={styles.tabButton}>
            <Text style={[styles.tabLabel, filter === 'weekly' && styles.tabLabelActive]}>Weekly Squad</Text>
            {filter === 'weekly' && <View style={styles.activePillGold} />}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setFilter('alltime')} style={styles.tabButton}>
            <Text style={[styles.tabLabel, filter === 'alltime' && styles.tabLabelActive]}>All-time Elite</Text>
            {filter === 'alltime' && <View style={styles.activePillGold} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* OPTIMIZED LIST RUNNING ON ICE BACKGROUND */}
      <ScrollView style={styles.rankScroll} contentContainerStyle={styles.rankScrollContent}>
        <View style={styles.podiumMockupBox}>
          <Text style={styles.podiumHeading}>🏆 LABC LATEST TOP SCORERS</Text>
        </View>

        <View style={styles.listCard}>
          {MOCK_RANKING.map((student) => {
            return (
              <View
                key={student.rank}
                style={[
                  styles.rankItemRow,
                  student.isMe ? styles.rankItemRowPersonalized : styles.rankItemNormal
                ]}
              >
                {/* Rank Digit */}
                <View style={styles.rankNumBlock}>
                  {student.badge ? (
                    <Text style={styles.rankBadgeEmoji}>{student.badge}</Text>
                  ) : (
                    <Text style={styles.serialDigit}>{student.rank}</Text>
                  )}
                </View>

                {/* Student Name */}
                <Text style={[styles.studentName, student.isMe && { fontWeight: 'bold' }]}>
                  {student.name}
                </Text>

                {/* Score */}
                <View style={styles.scoreCapsule}>
                  <Text style={styles.scoreCapsuleLabel}>{student.score} pts</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  leaderboardNavyHeader: {
    backgroundColor: '#0A1128',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#9AACBF',
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  tabBarFlex: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#9AACBF',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  activePillGold: {
    height: 3,
    backgroundColor: '#F5C518',
    width: 60,
    borderRadius: 2,
    marginTop: 4,
  },
  rankScroll: {
    flex: 1,
  },
  rankScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  podiumMockupBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  podiumHeading: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 10,
    color: '#1B3A7A',
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  rankItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  rankItemNormal: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F4FA',
  },
  rankItemRowPersonalized: {
    backgroundColor: '#FFF3B0',
    borderColor: '#F5C518',
  },
  rankNumBlock: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeEmoji: {
    fontSize: 18,
  },
  serialDigit: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: '#1B3A7A',
  },
  studentName: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#0A1128',
    flex: 1,
    marginLeft: 12,
  },
  scoreCapsule: {
    backgroundColor: '#0A1128',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreCapsuleLabel: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 11,
    color: '#F5C518',
    fontWeight: '700',
  },
});
`;

export const reactNativeSettingsCode = `import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch
} from 'react-native';

export default function SabiSettings() {
  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER WITH PROFILE AVATAR CONTAINER */}
      <View style={styles.profileHeaderBox}>
        <View style={styles.avatarMetallicContainer}>
          <Text style={styles.avatarLetters}>JD</Text>
        </View>
        <Text style={styles.aspirantName}>John Doe</Text>
        <Text style={styles.aspirantMajor}>Target: University of Ibadan • medicine</Text>
      </View>

      <ScrollView style={styles.bodyContainer} contentContainerStyle={styles.bodyContent}>
        
        {/* CALENDAR METRICS MATRIX GRAPH */}
        <Text style={styles.sectionHeading}>Study rhythm frequency tracker</Text>
        <View style={styles.matrixCalendarCard}>
          <Text style={styles.calendarSubText}>ACTIVE STUDY CALENDAR DAY MATRIX</Text>
          <View style={styles.gridRowWrap}>
            {Array.from({ length: 28 }).map((_, idx) => {
              const isActive = idx % 5 === 0 || idx % 7 === 1;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dailyCalendarSquare,
                    isActive ? styles.squareActive : styles.squareRest
                  ]}
                />
              );
            })}
          </View>
          <Text style={styles.calendarCaption}>Active session study days are illustrated as gold blocks</Text>
        </View>

        {/* SETTINGS CARD OPTIONS LIST */}
        <View style={styles.panelBlockCard}>
          <Text style={styles.cardHeadingLabel}>ASPIRANT SETTINGS</Text>

          {/* Setting option switcher */}
          <View style={styles.settingItemRow}>
            <View>
              <Text style={styles.optionMainText}>Daily Practice Reminder</Text>
              <Text style={styles.optionSubText}>Push notifications at 8:00 AM daily</Text>
            </View>
            <Switch value={true} trackColor={{ true: '#1B3A7A' }} />
          </View>

          <View style={styles.dividerHairline} />

          {/* Setting option switcher */}
          <View style={styles.settingItemRow}>
            <View>
              <Text style={styles.optionMainText}>Adaptive AI Level</Text>
              <Text style={styles.optionSubText}>System recalibrates questions adaptively</Text>
            </View>
            <Switch value={true} trackColor={{ true: '#1B3A7A' }} />
          </View>
        </View>

        {/* DANGER DELETION OPERATIONS */}
        <View style={styles.dangerZoneBox}>
          <TouchableOpacity style={styles.rawTextLink}>
            <Text style={styles.dangerTextLink}>LOGOUT DEVICE ACCOUNT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rawTextLink}>
            <Text style={styles.dangerTextLink}>DELETE ACCOUNT DATA PERMANENTLY</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#EBF1FA',
  },
  profileHeaderBox: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#D6E4F0',
    paddingVertical: 24,
    alignItems: 'center',
  },
  avatarMetallicContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#F5C518',
    backgroundColor: '#0A1128',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetters: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: '#FFF3B0',
    fontWeight: '900',
  },
  aspirantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: '#0A1128',
    marginTop: 10,
  },
  aspirantMajor: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  bodyContainer: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#0A1128',
    fontWeight: '800',
    marginBottom: 10,
  },
  matrixCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    padding: 16,
    marginBottom: 20,
  },
  calendarSubText: {
    fontFamily: 'JetBrainsMono-Bold',
    fontSize: 9,
    color: '#1B3A7A',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  dailyCalendarSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  squareActive: {
    backgroundColor: '#F5C518',
  },
  squareRest: {
    backgroundColor: '#E2E8F0',
  },
  calendarCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#4A5568',
  },
  panelBlockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6E4F0',
    padding: 16,
  },
  cardHeadingLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#1B3A7A',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionMainText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: '#0A1128',
  },
  optionSubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#4A5568',
    marginTop: 2,
  },
  dividerHairline: {
    height: 1,
    backgroundColor: '#F0F4FA',
  },
  dangerZoneBox: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  rawTextLink: {
    paddingVertical: 4,
  },
  dangerTextLink: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: '#D32F2F',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
`;
