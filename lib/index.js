import React, { Component } from 'react';
import {
  Modal,
  View,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  InteractionManager,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types'
import { RNCamera } from 'react-native-camera';
import RecordingButton from './RecordingButton';
import styles, { buttonClose, durationText } from './style';

export default class VideoRecorder extends Component {
  static propTypes = {
    isOpen: PropTypes.bool,
    runAfterInteractions: PropTypes.bool,
    cameraOptions: PropTypes.shape({}),
    recordOptions: PropTypes.shape({}),
    buttonCloseStyle: PropTypes.shape({}),
    durationTextStyle: PropTypes.shape({}),
    renderClose: PropTypes.func,
    renderSwitch: PropTypes.func,
    renderStep: PropTypes.func,
    textContent: PropTypes.string,
    maxLength: PropTypes.number,
    setFile: PropTypes.func,
    hasQuestion: PropTypes.bool,
    hasAnswer: PropTypes.bool,
    setQuestionIndex: PropTypes.func,
    lastQuestion: PropTypes.bool,
    submitInterview: PropTypes.func,
  }

  static defaultProps = {
    isOpen: false,
    runAfterInteractions: true,
    cameraOptions: {},
    recordOptions: {},
    buttonCloseStyle: buttonClose,
    durationTextStyle: durationText,
    renderClose: () => {},
    renderSwitch: () => {},
    renderStep: () => {},
    textContent: '',
    maxLength: 300,
    setFile: () => {},
    hasQuestion: false,
    hasAnswer: false,
    setQuestionIndex: () => {},
    lastQuestion: false,
    submitInterview: () => {},
  }

  constructor(...props) {
    super(...props);
    this.state = {
      isOpen: this.props.isOpen,
      loading: true,
      time: 0,
      recorded: false,
      recordedData: null
    };
  }

  componentDidMount() {
    const doPostMount = () => this.setState({ loading: false });
    if (this.props.runAfterInteractions) {
      InteractionManager.runAfterInteractions(doPostMount);
    } else {
      doPostMount();
    }
  }

  onSave = () => {
    if (this.callback) {
      this.callback(this.state.recordedData);
    } 
    
    this.close();
  }

  open = (options, callback) => {
    this.callback = callback;
    this.setState({
      ...options,
      isOpen: true,
      isRecording: false,
      time: 0,
      recorded: false,
      recordedData: null,
      converting: false,
    });
  }

  close = () => {
    this.setState({ isOpen: false });
  }

  startCapture = () => {
    const shouldStartCapture = () => {
      this.camera.recordAsync(this.props.recordOptions)
      .then((data) => {
        console.log('video capture', data);
        this.setState({
          recorded: true,
          recordedData: data,
        });
        this.props.setFile(data)
      }).catch(err => console.error(err));
      setTimeout(() => {
        this.startTimer();
        this.setState({
          isRecording: true,
          recorded: false,
          recordedData: null,
          time: 0,
        });
      });
    };
    if ((this.props.maxLength > 0) || (this.props.maxLength < 0)) {
      if (this.props.runAfterInteractions) {
        InteractionManager.runAfterInteractions(shouldStartCapture);
      } else {
        shouldStartCapture();
      }
    }
  }

  stopCapture = () => {
    const shouldStopCapture = () => {
      this.stopTimer();
      this.camera.stopRecording();
      this.onSave()
      this.setState({
        isRecording: false,
      });
    };
    if (this.props.runAfterInteractions) {
      InteractionManager.runAfterInteractions(shouldStopCapture);
    } else {
      shouldStopCapture();
    }
  }

  startTimer = () => {
    this.timer = setInterval(() => {
      const time = this.state.time + 1;
      this.setState({ time });
      if (this.props.maxLength > 0 && time >= this.props.maxLength) {
        this.stopCapture();
      }
    }, 1000);
  }

  stopTimer = () => {
    if (this.timer) clearInterval(this.timer);
  }

  onContinue = () => {
    if (this.props.lastQuestion) {
      this.props.submitInterview()
    } else {
      this.props.setQuestionIndex(index => index+1)
    }
  }

  convertTimeString = (time) => {
    const diff = this.props.maxLength - time;
    const addZero = (number) => number < 10 ? `0${number}` : number;
    return `${addZero(Math.floor(diff/60))}:${addZero(diff%60)}`
  }

  renderTimer() {
    const { isRecording, time, recorded } = this.state;
    return (
      <View style={{ width: 100, position: 'absolute', bottom: 50, alignItems: 'center', left: Dimensions.get('window').width*0.75 - 40 }}>
        {
          (recorded || isRecording) &&
          true &&
          <View>
            <Text style={this.props.durationTextStyle}>
              {/* <Text style={styles.dotText}>●</Text> */}
              {this.convertTimeString(time)}
            </Text>
            <Text style={{ color: 'white' }}>Time left</Text>
          </View>
        }
      </View>
    );
  }

  renderContent() {
    const { isRecording, recorded } = this.state;
    return (
      <View style={styles.controlLayer}>
        {this.renderTimer()}
        <View style={[styles.controls]}>
          <RecordingButton style={styles.recodingButton} isRecording={isRecording} onStartPress={this.startCapture}
            onStopPress={this.stopCapture} />
          {
              (!isRecording) &&
              <View style={{ position: 'absolute', bottom: 55, right: Dimensions.get('window').width*0.25 - 20 }}>
                {this.props.renderSwitch()}
              </View>
          }
        </View>
      </View>
    );
  }

  renderCamera() {
    return (
      <RNCamera
        ref={(cam) => { this.camera = cam; }}
        style={styles.preview}
        {...this.props.cameraOptions}
        captureAudio
      >
        {this.renderContent()}
      </RNCamera>
    );
  }

  render() {
    const { loading, isOpen, isRecording } = this.state;
    if (loading) return <View />;
    return (
      <Modal visible={isOpen} transparent animationType="fade"
        onRequestClose={this.close}>
        <View style={styles.modal}>
          <TouchableWithoutFeedback onPress={this.close}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.container}>
            {!this.props.hasAnswer ?
            <View style={styles.content}>
              {this.renderCamera()}
            </View> :
            <TouchableOpacity onPress={this.onContinue} style={{ position: 'absolute', bottom: 55, left: Dimensions.get('window').width*0.5 - 20 }}>
              <View style={{backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}><Text style={{color: 'black'}}>{this.props.lastQuestion ? 'Submit' : 'Next Question'}</Text></View>
            </TouchableOpacity>}
            { !isRecording && <TouchableOpacity onPress={this.close} style={{ position: 'absolute', bottom: 55, left: Dimensions.get('window').width*0.25 - 20 }}>
              {this.props.renderClose()}
            </TouchableOpacity>}
            <View style={{ position: 'absolute', bottom: 120 }}>
              <View style={{
                width: Dimensions.get('window').width - 15,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {this.props.renderStep()}
              </View>
              {this.props.hasQuestion && <View style={{
                width: Dimensions.get('window').width - 15,
                justifyContent: 'center'
              }}>
                {this.props.hasAnswer ? <Text style={{ paddingHorizontal: 8, color: isRecording ? 'white' : 'gold', fontSize: 18, fontWeight: 'bold' }}>{ isRecording ? this.props.textContent : '* You had already answered this question'}</Text> :
                <Text style={{ paddingHorizontal: 8, color: isRecording ? 'white' : 'gold', fontSize: 18, fontWeight: 'bold' }}>{ isRecording ? this.props.textContent : '* Question will be shown here when recording started'}</Text>}
              </View>}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}
