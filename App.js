import * as Clipboard from 'expo-clipboard';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Pressable,
    Animated as RNAnimated,
    Easing,
    Modal,
    FlatList,
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

// --- Color Conversion and Generation Functions ---
function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function generatePalette() {
    const palette = [];
    const baseHue = Math.floor(Math.random() * 360);
    const rules = ['monochromatic', 'analogous', 'complementary', 'triadic', 'splitComplementary'];
    const chosenRule = rules[Math.floor(Math.random() * rules.length)];

    let hues = [];
    switch (chosenRule) {
        case 'monochromatic':
            hues = Array(5).fill(baseHue);
            break;
        case 'analogous':
            hues = [
                (baseHue - 45 + 360) % 360,
                (baseHue - 20 + 360) % 360,
                baseHue,
                (baseHue + 20) % 360,
                (baseHue + 45) % 360,
            ];
            break;
        case 'complementary':
            hues = [baseHue, (baseHue + 180) % 360, baseHue, (baseHue + 180) % 360, baseHue];
            break;
        case 'triadic':
            hues = [
                baseHue,
                (baseHue + 120) % 360,
                (baseHue + 240) % 360,
                baseHue,
                (baseHue + 120) % 360,
            ];
            break;
        case 'splitComplementary':
            hues = [
                baseHue,
                (baseHue + 150) % 360,
                (baseHue + 210) % 360,
                baseHue,
                (baseHue + 150) % 360,
            ];
            break;
        default:
            hues = Array(5).fill(baseHue);
    }

    for (let i = 0; i < 5; i++) {
        const finalHue = (hues[i] + (Math.random() * 10 - 5) + 360) % 360;
        let saturation;
        let lightness;

        if (chosenRule === 'monochromatic') {
            saturation = Math.floor(60 + Math.random() * 30);
            lightness = Math.floor(25 + Math.random() * 60);
        } else {
            saturation = Math.floor(60 + Math.random() * 30);
            lightness = Math.floor(45 + Math.random() * 20);
        }
        palette.push(hslToHex(finalHue, saturation, lightness));
    }
    return palette;
}

export default function App() {
    const [palette, setPalette] = useState(generatePalette());
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [savedPalettes, setSavedPalettes] = useState([]);
    const [isMenuVisible, setIsMenuVisible] = useState(false);

    const circleScale = useRef(new RNAnimated.Value(darkMode ? 1 : 0)).current;

    useEffect(() => {
        const loadPalettes = async () => {
            try {
                const storedPalettes = await AsyncStorage.getItem('savedPalettes');
                if (storedPalettes) {
                    setSavedPalettes(JSON.parse(storedPalettes));
                }
            } catch (e) {
                console.error('Failed to load palettes:', e);
            }
        };
        loadPalettes();
    }, []);

    useEffect(() => {
        RNAnimated.timing(circleScale, {
            toValue: darkMode ? 1 : 0,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [darkMode]);

    const handleGenerate = () => {
        setPalette(generatePalette());
        setExpandedIndex(null);
    };

    const handleCopySingle = async (color) => {
        await Clipboard.setStringAsync(color);
        Alert.alert('Copied!', color);
    };

    const handleTapColor = (index) => {
        setExpandedIndex((prev) => (prev === index ? null : index));
    };

    const getFlexValue = (i) => {
        if (expandedIndex === null) return 1;
        return expandedIndex === i ? 1.3 : 0.7;
    };

    const bgColor = circleScale.interpolate({
        inputRange: [0, 1],
        outputRange: ['#ff8c00', '#8983f7'],
    });

    const circleBgScale = circleScale.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const containerBg = darkMode ? '#26242e' : '#e8e8e8';
    const cardBg = darkMode ? '#333' : '#fff';
    const textColor = darkMode ? '#e8e8e8' : '#264653';

    const savePalette = async () => {
        try {
            const newSavedPalettes = [...savedPalettes, { id: Date.now(), colors: palette }];
            setSavedPalettes(newSavedPalettes);
            await AsyncStorage.setItem('savedPalettes', JSON.stringify(newSavedPalettes));
            Alert.alert('Palette Saved!', `Palette #${newSavedPalettes.length} saved.`);
        } catch (e) {
            console.error('Failed to save palette:', e);
            Alert.alert('Error', 'Failed to save palette.');
        }
    };

    const deletePalette = useCallback(async (id) => {
        Alert.alert(
            'Delete Palette',
            'Are you sure you want to delete this palette?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', onPress: async () => {
                        try {
                            const updatedPalettes = savedPalettes.filter((p) => p.id !== id);
                            setSavedPalettes(updatedPalettes);
                            await AsyncStorage.setItem('savedPalettes', JSON.stringify(updatedPalettes));
                            Alert.alert('Deleted', 'Palette deleted successfully.');
                        } catch (e) {
                            console.error('Failed to delete palette:', e);
                            Alert.alert('Error', 'Failed to delete palette.');
                        }
                    }
                },
            ],
            { cancelable: true }
        );
    }, [savedPalettes]);

    const loadPalette = useCallback((colors) => {
        setPalette(colors);
        setExpandedIndex(null);
        setIsMenuVisible(false);
        Alert.alert('Palette Loaded', 'The selected palette is now active.');
    }, []);

    const SavedPaletteItem = ({ item, index }) => {
        return (
            <View style={styles.miniPaletteContainer}>
                <TouchableOpacity
                    style={styles.miniPaletteContent}
                    onPress={() => loadPalette(item.colors)}
                    activeOpacity={0.7}
                >
                    <View style={styles.miniPaletteInfo}>
                        <Text style={styles.miniPaletteLabel}>#{index + 1}</Text>
                    </View>
                    <View style={styles.miniPaletteColors}>
                        {item.colors.map((color, i) => (
                            <View
                                key={`${item.id}-${color}-${i}`}
                                style={[styles.miniColorBlock, { backgroundColor: color }]}
                            />
                        ))}
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deletePalette(item.id)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={[
                    styles.container,
                    { backgroundColor: darkMode ? '#444443ff' : '#F8FBFE' },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <View style={styles.dotsWrapper}>
                        <View style={[styles.circleSmall, { backgroundColor: '#ff605c' }]} />
                        <View style={[styles.circleSmall, { backgroundColor: '#ffbd44' }]} />
                        <View style={[styles.circleSmall, { backgroundColor: '#00ca4e' }]} />
                    </View>

                    <TouchableOpacity
                        style={styles.menuButtonContainer}
                        onPress={() => setIsMenuVisible(true)}
                    >
                        <View style={styles.switchWrapper}>
                            <View style={styles.row}>
                                <View style={styles.dot}></View>
                                <View style={styles.dot}></View>
                            </View>
                            <View style={[styles.row, styles.rowBottom]}>
                                <View style={styles.dot}></View>
                                <View style={styles.dot}></View>
                            </View>
                            <View style={styles.rowVertical}>
                                <View style={styles.dot}></View>
                                <View style={[styles.dot, styles.middleDot]}></View>
                                <View style={styles.dot}></View>
                            </View>
                            <View style={styles.rowHorizontal}>
                                <View style={styles.dot}></View>
                                <View style={[styles.dot, styles.middleDotHorizontal]}></View>
                                <View style={styles.dot}></View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: textColor }]}>Palette Generator</Text>

                    <Pressable
                        onPress={() => setDarkMode((d) => !d)}
                        style={[styles.bigCircleWrapper, { backgroundColor: containerBg }]}
                    >
                        <RNAnimated.View style={[styles.bigCircle, { backgroundColor: bgColor }]}>
                            <RNAnimated.View
                                style={[
                                    styles.circleOverlay,
                                    {
                                        transform: [{ scale: circleBgScale }],
                                        backgroundColor: containerBg,
                                        top: '5%',
                                    },
                                ]}
                            />
                        </RNAnimated.View>
                        <View style={styles.modeLabelsWrapper}>
                            <Text style={[styles.modeLabel, { color: darkMode ? '#444' : '#ff8c00' }]}>light</Text>
                            <Text style={[styles.modeLabel, { color: darkMode ? '#8983f7' : '#444' }]}>dark</Text>
                        </View>
                    </Pressable>

                    <View style={styles.palette}>
                        {palette.map((color, i) => {
                            const isExpanded = i === expandedIndex;
                            return (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.color,
                                        {
                                            flex: getFlexValue(i),
                                            height: 180,
                                            backgroundColor: color,
                                            borderColor: isExpanded ? '#000000' : 'transparent',
                                            borderWidth: isExpanded ? 2 : 0,
                                            transform: [{ scale: isExpanded ? 1.05 : 1 }],
                                        },
                                    ]}
                                    activeOpacity={0.9}
                                    onPress={() => handleTapColor(i)}
                                >
                                    {isExpanded ? (
                                        <TouchableOpacity
                                            onPress={() => handleCopySingle(color)}
                                            activeOpacity={0.7}
                                            style={styles.hexContainer}
                                        >
                                            <Text style={[styles.hex, { color: '#fff' }]}>{color.replace('#', '')}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={[styles.hex, { color: '#fff' }]}>{color.replace('#', '')}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.bottomButtonsContainer}>
                        <TouchableOpacity style={styles.button} onPress={handleGenerate} activeOpacity={0.8}>
                            <Text style={styles.buttonText}>Generate Palette</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.saveBtn} onPress={savePalette} activeOpacity={0.8}>
                            <View style={styles.saveBtnSign}>
                                <Text style={styles.saveBtnSignText}>+</Text>
                            </View>
                            <View style={styles.saveBtnTextContainer}>
                                <Text style={styles.saveBtnText}>Save</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isMenuVisible}
                    onRequestClose={() => setIsMenuVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setIsMenuVisible(false)}>
                                <Text style={[styles.closeButtonText, { color: textColor }]}>X</Text>
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Saved Palettes</Text>
                            {savedPalettes.length === 0 ? (
                                <Text style={[styles.emptyListText, { color: textColor }]}>No palettes saved yet.</Text>
                            ) : (
                                <FlatList
                                    data={savedPalettes}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={({ item, index }) => (
                                        <SavedPaletteItem item={item} index={index} />
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    card: {
        width: '95%',
        height: '75%',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        alignItems: 'center',
        position: 'relative',
    },
    dotsWrapper: {
        position: 'absolute',
        top: 15,
        left: 10,
        flexDirection: 'row',
        zIndex: 10,
    },
    circleSmall: {
        width: 18,
        height: 16,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    menuButtonContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    switchWrapper: {
        width: 35,
        height: 35,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    row: {
        width: '100%',
        height: '50%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    rowBottom: {
        alignItems: 'flex-end',
    },
    dot: {
        width: 8,
        height: 8,
        borderWidth: 2,
        borderColor: 'black',
        borderRadius: 50,
    },
    rowHorizontal: {
        position: 'absolute',
        width: '100%',
        height: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowVertical: {
        position: 'absolute',
        width: 'auto',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    middleDot: {},
    middleDotHorizontal: {},
    title: {
        marginTop: 22,
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    bigCircleWrapper: {
        width: 128,
        height: 128,
        borderRadius: 64,
        position: 'relative',
        marginBottom: 30,
        alignItems: 'center',
    },
    bigCircle: {
        width: 128,
        height: 128,
        borderRadius: 64,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    circleOverlay: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        right: 0,
    },
    modeLabelsWrapper: {
        position: 'absolute',
        bottom: -50,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modeLabel: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    palette: {
        marginTop: 30,
        flexDirection: 'row',
        width: '100%',
        height: 180,
        justifyContent: 'space-between',
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    color: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    hexContainer: {
        padding: 5,
        borderRadius: 6,
        backgroundColor: 'rgba(15, 15, 15, 0.3)',
    },
    hex: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    bottomButtonsContainer: {
        flexDirection: 'row',
        marginTop: 'auto',
        marginBottom: 10,
        justifyContent: 'space-around',
        width: '100%',
    },
    button: {
        backgroundColor: '#241d85ff',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 6,
        left: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    saveBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: 45,
        height: 45,
        borderRadius: 45 / 2,
        borderWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.199,
        shadowRadius: 10,
        elevation: 5,
        backgroundColor: '#f8fcbeff',
        right: 40,
    },
    saveBtnSign: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnSignText: {
        fontSize: 2.2 * 16,
        color: 'black',
    },
    saveBtnTextContainer: {
        position: 'absolute',
        right: 10,
        width: 0,
        opacity: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: {
        color: 'white',
        fontSize: 1.4 * 16,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 15,
        padding: 5,
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        opacity: 0.7,
    },
    miniPaletteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 5,
        marginVertical: 5,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        height: 60,
    },
    miniPaletteContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingRight: 10,
    },
    miniPaletteInfo: {
        marginRight: 10,
    },
    miniPaletteLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    miniPaletteColors: {
        flexDirection: 'row',
        flex: 1,
        height: 40,
        borderRadius: 5,
        overflow: 'hidden',
    },
    miniColorBlock: {
        flex: 1,
        height: '100%',
    },
    deleteButton: {
        backgroundColor: '#F44336',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginLeft: 10,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});