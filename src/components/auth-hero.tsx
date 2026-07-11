import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const heroImage = require('../../assets/images/campingnard-register-hero.png');
const logoImage = require('../../assets/images/campingnard-logo.png');

export function AuthHero() {
  return (
    <View style={styles.hero}>
      <Image source={heroImage} style={styles.image} resizeMode="cover" />
      <View style={[styles.fade, styles.fade1]} />
      <View style={[styles.fade, styles.fade2]} />
      <View style={[styles.fade, styles.fade3]} />
      <View style={styles.brand}>
        <Image source={logoImage} style={styles.brandLogo} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 280, backgroundColor: '#0a2218', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  fade: { position: 'absolute', left: 0, right: 0 },
  fade1: { bottom: 0, height: 80, backgroundColor: 'rgba(10,34,24,0.78)' },
  fade2: { bottom: 80, height: 60, backgroundColor: 'rgba(10,34,24,0.38)' },
  fade3: { bottom: 140, height: 40, backgroundColor: 'rgba(10,34,24,0.14)' },
  brand: {
    position: 'absolute',
    bottom: 18,
    left: 20,
  },
  brandLogo: {
    width: 200,
    height: 60,
  },
});
