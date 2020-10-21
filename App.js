import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Button,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import {
  useDeviceOrientation,
  useCameraRoll,
} from "@react-native-community/hooks";
import {
  CAMERA,
  CAMERA_ROLL,
  AUDIO_RECORDING,
  usePermissions,
} from "expo-permissions";
import { Camera } from "expo-camera";
import Video from "expo-av";
import FileSystem from "expo-file-system";
import useToggle from "./components/custom_hooks/toggle";

export default function App() {
  // const [photos, getPhotos, saveToCameraRoll] = useCameraRoll();
  const camera = useRef();
  const [record, toggleRecord] = useToggle(false);
  const [openCamera, toggleOpenCamera] = useToggle(false);
  const { landscape } = useDeviceOrientation();
  const lastVideo = async () => {
    const result = await FileSystem.getInfoAsync(
      FileSystem.cacheDirectory() + "lastVideo.mp4"
    );
    console.log("result:", result);
    return result && FileSystem.cacheDirectory() + "lastVideo.mp4";
  };
  const [activeVideo, setActiveVideo] = useState(null);
  const [
    permissions,
    askPermissions,
    getPermissions,
  ] = usePermissions(AUDIO_RECORDING, CAMERA, CAMERA_ROLL, { ask: true });

  useEffect(() => {
    (async () => {
      try {
        // while (status !== "granted") {
        await askPermissions();

        if (permissions.status.toString() !== "granted") {
          Alert.alert(
            "Permission error",
            "Permission to use camera and record audio required to record video",
            [
              { text: "Retry", onPress: () => askPermissions() },
              { text: "cancel" },
            ]
          );
        }
      } catch (e) {
        console.log("error:", e);
      }
    })();
  }, []);

  // const [downloadProgress, setDownloadProgress] = useState();
  // const callback = async () => {
  // const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
  // setDownloadProgress(progress)
  // };

  // const resumableDownload = FileSystem.createDownloadResumable(
  // Last firebase upload
  // Filesystem.documentDirectory + filename
  // {},
  // callback
  //   )
  // };
  const handleClose = () => {
    if (record) {
      toggleRecord();
    }
    toggleOpenCamera();
  };

  const handleRecord = async () => {
    try {
      const { status = null } = await Camera.requestPermissionsAsync();
      console.log(status);
      if (!record && status === "granted") {
        const options = {
          quality: Camera.Constants.VideoQuality["480p"],
        };

        if (camera) {
          console.log("record");
          toggleRecord();
          const data = await camera.current.recordAsync(options);

          if (data.uri) {
            FileSystem.data.uri;
            setActiveVideo(data.uri);
            console.log(data);
          }
        }
      } else {
        if (camera) {
          console.log("stop");
          await camera.current.stopRecording();
          toggleRecord();
        }
      }
    } catch (e) {
      console.log("recording error:", e);
    }
  };

  // console.log("camcam", camera);
  // console.log("vidvid", activeVideo);
  return (
    <View style={styles.container}>
      {openCamera ? (
        <Camera
          ref={camera}
          autoFocus
          style={styles.videoPreview}
          type={Camera.Constants.Type.back}
          ratio={landscape ? "16:9" : "4:3"}
          flashMode={Camera.Constants.FlashMode.off}
        >
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handleRecord}
              style={record ? styles.stopBtn : styles.recBtn}
            >
              <Text style={record ? styles.stopBtnTxt : styles.recBtnTxt}>
                {record ? "STOP" : "REC"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
              <Text style={styles.backBtnTxt}>Back</Text>
            </TouchableOpacity>
          </View>
        </Camera>
      ) : (
        <View style={styles.container}>
          <View style={styles.title} height={landscape ? "100vh" : "30%"}>
            <Text style={styles.titleText}>Get ready...</Text>
          </View>
          <Button title="Make a video" onPress={toggleOpenCamera}></Button>
          {activeVideo ? (
            <Video
              source={{
                uri: activeVideo,
              }}
              rate={1.0}
              volume={1.0}
              isMuted={true}
              resizeMode="cover"
              shouldPlay={false}
              isLooping={false}
              useNativeControls
              style={{
                flex: 1,
                width: 300,
                height: 300,
                backgroundColor: "black",
              }}
            />
          ) : (
            <></>
          )}
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    width: "100%",
  },
  title: {
    marginBottom: "5%",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    backgroundColor: "black",
    width: "100%",
  },
  titleText: {
    color: "white",
    fontSize: 50,
  },
  bodyText: {
    marginTop: 20,
    marginBottom: 20,
  },
  videoPreview: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  controls: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  recBtn: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    margin: 20,
  },
  recBtnTxt: {
    color: "red",
  },
  stopBtn: {
    flex: 1,
    backgroundColor: "red",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    margin: 20,
  },
  stopBtnTxt: {
    color: "#fff",
  },
  backBtn: {
    flex: 0,
    backgroundColor: "dodgerblue",
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 20,
    margin: 20,
  },
  backBtnTxt: {
    color: "#fff",
  },
});
