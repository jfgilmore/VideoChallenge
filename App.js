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
  // useCameraRoll,
} from "@react-native-community/hooks";
import {
  CAMERA,
  CAMERA_ROLL,
  AUDIO_RECORDING,
  usePermissions,
} from "expo-permissions";
import { Camera } from "expo-camera";
import Video from "expo-av";
import * as FileSystem from "expo-file-system";
import Toast from "react-native-simple-toast";
import useToggle from "./components/custom_hooks/toggle";

export default function App() {
  const camera = useRef();
  const [record, toggleRecord] = useToggle(false);
  const [openCamera, toggleOpenCamera] = useToggle(false);
  const { landscape } = useDeviceOrientation();
  const [activeVideo, setActiveVideo] = useState("");
  // const [photos, getPhotos, saveToCameraRoll] = useCameraRoll();
  const appDir = FileSystem.cacheDirectory + "video_challenge/";
  const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(appDir);
    if (!dirInfo.exists) {
      Toast.show("App directory doesn't exist, creating...", Toast.LONG);
      await FileSystem.makeDirectoryAsync(appDir, { intermediates: true });
    }
  };
  const [
    permissions = "",
    askPermissions,
    getPermissions,
  ] = usePermissions(AUDIO_RECORDING, CAMERA, CAMERA_ROLL, { ask: true });

  let count = 1;
  useEffect(() => {
    (async () => {
      try {
        await askPermissions();

        if (permissions.status !== "granted") {
          count = 0;
        }
      } catch (e) {
        Toast.showWithGravity(
          "You can allow permissions later in settings",
          Toast.LONG,
          Toast.TOP
        );
        console.log("permissions error:", e);
      }

      return () => {
        permissions.status = "granted";
      };
    })();

    // ToDo: implement cleanup method
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
  const handleClose = async () => {
    if (record) {
      toggleRecord();
      await camera.current.stopRecording();
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
          ensureDirExists();
          const data = await camera.current.recordAsync(options);

          if (data.uri) {
            console.log(data);
            const newUri = appDir + "sample.mp4";
            const done = await FileSystem.copyAsync({
              from: data.uri,
              to: newUri,
            });
            console.log(1);
            console.log(done);
            // if (done) {
            console.log(2);
            Toast.show("Video saved", Toast.TOP);
            setActiveVideo(newUri);
            console.log(newUri);
            // } else {
            console.log(3);
            Toast.showWithGravity("Save failed", Toast.LONG, Toast.TOP);
            // }
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
          {activeVideo !== "" ? (
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
