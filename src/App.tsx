//@ts-ignore
import {XYPlot, XAxis, YAxis,HorizontalGridLines, LineSeries, makeWidthFlexible} from 'react-vis';
import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import CssBaseline from '@material-ui/core/CssBaseline';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/core/Slider';
import { withStyles,WithStyles, createStyles } from '@material-ui/core';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

const FlexibleXYPlot = makeWidthFlexible(XYPlot); 


const styles = createStyles({
    root: {
        padding:'5%',
        textAlign: 'center',
        // position: 'fixed',
        // top: '40%',
        // left: '50%',
        // transform: 'translate(-50%, -25%)'
    }
});


const client = mqtt.connect('wss://farmer.cloudmqtt.com', {
    username: 'qxmyeasp',
    password: 'yLDaUiNHlnGG',
    port: 30960
});


client.on('connect', function () {
    client.subscribe('my/amazing/sensor', function (err) {
        console.log('subscribed');
        if (err) {
            console.error(err);
        }
    })

    client.subscribe('light/brightness', function (err) {
        console.log('subscribed');
        if (err) {
            console.error(err);
        }
    })

    client.subscribe('led_strip/sensor/light_sensor/state', function (err) {
        console.log('subscribed');
        if (err) {
            console.error(err);
        }
    })
});

interface AppProps extends WithStyles<typeof styles> {

}

const App = (props: AppProps) => {
    const {classes} = props;
    const [num,setNum] = useState(0);

    const [light,setLight] = useState(0.00391);
    const [lightMax,setLightMax] = useState(-1);
    const [lightMin,setLightMin] = useState(1);

    const [percentage,setPercentage] = useState(0);
    
    const [lightOn,setLightOn] = useState(false);

    const [data,setData] = useState<Array<{x:Date,y:number}>>([]);

    const [motionData,setMotionData] = useState<Array<{x:Date,y:number}>>([]);

    const [wantedBrightness,setWantedBrightness] = useState(0);

    const setBrightness =  (value:number) => {
        setWantedBrightness(value);
        client.publish('light/brightness', `${value}`)
    };

    useEffect(()=> {
        client.on('message', (topic, message) => {
            // message is Buffer
            console.log(`topic: ${topic} - ${message.toString()}`);

            if(topic === 'led_strip/sensor/light_sensor/state'){
                const value = Number(message);
                setLight(value);
            } else if(topic === 'my/amazing/sensor'){
                if(message.toString() === 'start') setLightOn(true);
                else if(message.toString() === 'stop') setLightOn(false);
                else console.error(`Unknown message ${message} in topic ${topic}`)
            }
        });
    },[]);

    useEffect(() => {
        setMotionData([...motionData,{x:new Date(), y: lightOn ? lightMax : 0 }])
    },[lightOn]);

    useEffect(() => {
        const value  = light;
        if(value < lightMin) {
            console.log(`new min ${value} < ${lightMin}`);
            setLightMin(value);
        }
        if(value > lightMax) { 
            console.log(`new max ${value} > ${lightMax}`);
            setLightMax(value);
        }
        setData([...data,{x:new Date(), y:value}])

    },[light,lightMax,lightMin])

    useEffect(() => {
        if(lightMin < light && light < lightMax){
            const range = lightMax - lightMin;
            const low = light - lightMin;
            const x = low / range;
            console.log(`Range is ${range}, norm.num is  ${low}, it is ${x} %`)
            setPercentage(x);
        } else if(light === lightMax){
            setPercentage(1);
        } else if(light === lightMin){
            setPercentage(0);
        } 
    },[light,lightMax,lightMin]);

    const toggleLight =  () => {
        if(lightOn){
            client.publish('my/amazing/sensor', 'stop')
        } else {
            client.publish('my/amazing/sensor', 'start')
        }
    };

    useEffect(() =>{
        if(lightOn){
            const brightness = Math.floor(percentage * 200 + 55);
            client.publish('light/brightness',`${brightness}`);
        }
    },[percentage,lightOn]);

    return (
        <Paper className={classes.root}>
            <Typography variant="h1">PDI Viz</Typography>
            <CssBaseline/>
            <header className="App-header">
                <p> Light: {lightMin} {'<='} {light} {'<='} {lightMax}</p>
                <p> {percentage * 100} % => {Math.floor(percentage * 200 + 55)} [55,255]</p>
                
                <Typography id="discrete-slider" gutterBottom>
                    Wanted brightness : {wantedBrightness}
                </Typography>
                <Slider min={0} max={255} value={wantedBrightness} onChange={(_,value) => setBrightness(value as number)} aria-labelledby="continuous-slider" />

                <FormControlLabel
                    control={
                        <Switch checked={lightOn} onChange={toggleLight} value="light-strip" />
                    }
                    label="Light strip"
                />
            </header>
            <Typography variant="h3">Graphs</Typography>
            <FlexibleXYPlot
                xType="time"
                height={300}
                >
                <HorizontalGridLines />
                <XAxis />
                <YAxis/>
                <LineSeries
                    color="red"
                    className="first-series"
                    data={data}
                    title="light-sensor"
                />
                <LineSeries
                    color="blue"
                    className="motion-series"
                    data={motionData}
                />
            </FlexibleXYPlot>
        </Paper>
    );
};

export default withStyles(styles, {withTheme: true})(App);
