import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  RtcConnection,
  IRtcEngineEventHandler,
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore';

const appId = 'c3e485d845be4643a5120bc25575764d'; 

export default function CallScreen() {
  const router = useRouter();
  const { channel, name, isVideo } = useLocalSearchParams();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [joined, setJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(isVideo === 'false');
  const [isSpeakerphone, setIsSpeakerphone] = useState(isVideo === 'true');
  const [errorMsg, setErrorMsg] = useState('');
  
  const agoraEngineRef = useRef<IRtcEngine | null>(null);
  
  const initEngine = async () => {
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
      }
      
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;
      
      agoraEngine.initialize({
        appId: appId,
      });
      
      const eventHandler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: (_connection: RtcConnection, elapsed: number) => {
          setJoined(true);
        },
        onUserJoined: (_connection: RtcConnection, uid: number, elapsed: number) => {
          setRemoteUid(prev => [...prev, uid]);
        },
        onUserOffline: (_connection: RtcConnection, uid: number) => {
          setRemoteUid(prev => prev.filter(id => id !== uid));
        },
        onError: (err: number, msg: string) => {
          setErrorMsg(msg);
        }
      };
      
      agoraEngine.registerEventHandler(eventHandler);
      
      agoraEngine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      
      if (isVideo === 'true') {
        agoraEngine.enableVideo();
        agoraEngine.startPreview();
      } else {
        agoraEngine.enableAudio();
        agoraEngine.disableVideo();
      }
      
      agoraEngine.setEnableSpeakerphone(isVideo === 'true');
      
      const uid = 0; 
      
      agoraEngine.joinChannel('', channel as string, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to initialize call');
    }
  };

  useEffect(() => {
    initEngine();
    
    return () => {
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    agoraEngineRef.current?.muteLocalAudioStream(!isMuted);
  };
  
  const toggleCamera = () => {
    const newState = !isCameraOff;
    setIsCameraOff(newState);
    agoraEngineRef.current?.muteLocalVideoStream(newState);
  };
  
  const switchCamera = () => {
    agoraEngineRef.current?.switchCamera();
  };

  const toggleSpeakerphone = () => {
    const newState = !isSpeakerphone;
    setIsSpeakerphone(newState);
    agoraEngineRef.current?.setEnableSpeakerphone(newState);
  };
  
  const leaveCall = () => {
    agoraEngineRef.current?.leaveChannel();
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={leaveCall} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{name}</Text>
        <View style={{ width: 44 }} />
      </View>
      
      {errorMsg ? (
        <View style={styles.center}>
          <Text style={{ color: '#EF4444', marginBottom: 16 }}>{errorMsg}</Text>
          <TouchableOpacity onPress={leaveCall} style={{ padding: 12, backgroundColor: '#374151', borderRadius: 8 }}>
            <Text style={{ color: 'white' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : !joined ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={{ color: 'white', marginTop: 10 }}>Joining {name}...</Text>
        </View>
      ) : (
        <View style={styles.videoContainer}>
           {remoteUid.length > 0 ? (
             <View style={styles.remoteGrid}>
               {remoteUid.map((id) => (
                 <RtcSurfaceView 
                   key={id} 
                   canvas={{ uid: id }} 
                   style={remoteUid.length === 1 ? styles.fullScreen : styles.halfScreen} 
                 />
               ))}
             </View>
           ) : (
             <View style={styles.center}>
                <View style={styles.avatarPlaceholder}>
                   <Ionicons name="person" size={48} color="#4B5563" />
                </View>
                <Text style={{ color: '#9CA3AF', fontSize: 16, marginTop: 16 }}>Waiting for others to join...</Text>
             </View>
           )}
           
           {isVideo === 'true' && !isCameraOff && (
             <View style={styles.localVideo}>
               <RtcSurfaceView canvas={{ uid: 0 }} style={{ flex: 1 }} />
             </View>
           )}
        </View>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlSmallBtn, isSpeakerphone && styles.controlBtnActive]} onPress={toggleSpeakerphone}>
          <Ionicons name={isSpeakerphone ? "volume-high" : "volume-medium"} size={22} color={isSpeakerphone ? "white" : "#9CA3AF"} />
        </TouchableOpacity>

        <View style={styles.mainControls}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnOff]} onPress={toggleMute}>
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#000" : "white"} />
          </TouchableOpacity>
          
          {isVideo === 'true' && (
            <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnOff]} onPress={toggleCamera}>
              <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={28} color={isCameraOff ? "#000" : "white"} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#EF4444' }]} onPress={leaveCall}>
            <Ionicons name="call" size={28} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>

        {isVideo === 'true' ? (
          <TouchableOpacity style={styles.controlSmallBtn} onPress={switchCamera} disabled={isCameraOff}>
            <Ionicons name="camera-reverse" size={22} color={isCameraOff ? "#4B5563" : "white"} />
          </TouchableOpacity>
        ) : (
          <View style={styles.controlSmallBtnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { padding: 8 },
  headerText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  videoContainer: { flex: 1, position: 'relative' },
  remoteGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  fullScreen: { width: '100%', height: '100%' },
  halfScreen: { width: '50%', height: '50%' },
  localVideo: { position: 'absolute', bottom: 20, right: 20, width: 110, height: 150, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#262626', backgroundColor: '#111' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 24, paddingBottom: 40 },
  mainControls: { flexDirection: 'row', gap: 20 },
  controlBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  controlBtnOff: { backgroundColor: '#FFFFFF' },
  controlSmallBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  controlSmallBtnPlaceholder: { width: 48, height: 48 },
  controlBtnActive: { backgroundColor: '#4F46E5' },
});