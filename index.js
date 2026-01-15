import { cancel, intro, isCancel, note, outro, select, spinner, text } from "@clack/prompts"
import fs from "fs"
import os from "os"
import path from "path"
import { CLIENT_RENEG_LIMIT } from "tls"

// const args = process.argv.slice(2)
// const command = args[0]
// const duration = args[1]

const DATA_DIR = path.join(os.homedir(), ".pomocli")
const DATA_FILE = path.join(os.homedir(), "stats.json")

// ensure files and folder exists

function ensureStorage(){
    if(!fs.existsSync(DATA_DIR)){
        fs.mkdirSync(DATA_DIR);
    }

    if(!fs.existsSync(DATA_FILE)){
        const today = new Date().toISOString().slice(0,10)
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify({
                date : today,
                focusMinutes : 0,
                breakMinutes : 0,
                sessions : 0
            }, null, 2)
        )
    }
}

// load the stats 
function loadStats(){
    ensureStorage();
    const data = JSON.parse(fs.readFileSync(DATA_FILE),"UTF-8")
    const today = new Date().toISOString().slice(0,10)

    if(data.date !== today){
        return {
            date : today,
            focusMinutes : 0,
            breakMinutes : 0,
            sessions : 0,
        }
    }
    return data
}

// function to save the stats
function saveStats(stats){
    fs.writeFileSync(DATA_FILE, JSON.stringify(stats, null, 2))
}


// function to format time 
function formatTime(sec){
    const minutes = String(Math.floor(sec/ 60)).padStart(2,"0")
    const seconds = String(sec % 60).padStart(2, "0")
    return `${minutes}:${seconds}`
}

// timer function 

// function runTimer(seconds, label){
//     return new Promise((resolve) => {
//         const spin = spinner()
//         let remaining = seconds;
//         spin.start(`${label} started`)
//         // process.stdout.write(`\n${label} started`)
//         const interval = setInterval(()=>{
//             // note(`\r${label} : ${formatTime(remaining)}`)
//             let output = `\r${label} : ${formatTime(remaining)}`
            
//             remaining--;

//             if(remaining < 0){
//                 clearInterval(interval)
//                 process.stdout.write("\n")
//                 resolve()
//                 spin.stop()
//             }
//         }, 1000)
//     })
// }


async function runTimer(seconds, label) {
    const s = spinner();
    s.start(`${label} started`);

    let remaining = seconds;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            s.message(`${label}: ${formatTime(remaining)}`);
            remaining--;

            if (remaining < 0) {
                clearInterval(interval);
                s.stop(`${label} finished`);
                resolve();
            }
        }, 1000);
    });
}

// run command 
async function startPomodoro(focusDuration, breakDuration){
    const stats = loadStats()

    await runTimer(focusDuration*60, "focus")

    stats.focusMinutes += focusDuration;
    stats.sessions += 1;

    saveStats(stats);

    // run a break session
    await runTimer(breakDuration*60, "Break")

    stats.breakMinutes += breakDuration;
    saveStats(stats)

    cancel("\nSession Done")
}

function showStats(){
    const stats = loadStats() 
    note(`TODAY:\nFOCUS: ${stats.focusMinutes} MINS\nBREAK: ${stats.breakMinutes} MINS\nSESSIONS: ${stats.sessions}`, 'STATS')
}
// router 
// if(command === "start" || command === "Start"){
//     startPomodoro();
// }else if(command === "stats" || command === "Stats"){
//     showStats()
// }else{
//     console.log("invalid command")
//     console.log("use : pomocli start / stats")
// }


async function main(){
    note(`WELCOME TO POMOCLI`)

    const command = await select({
        message : "choose mode : ",
        options : [
            { value : "start", label : "start focus session" },
            { value : "stats", label : "see todays stats"}
        ]
    })

    if(isCancel(command)){
        console.log("operation cancelled")
        process.exit(0)
    }

    // console.log(command)

    // routing 

    if(command === 'start'){
        const focustime = await text({
            message : "enter duration (in mins) : ",
            placeholder : "25"
        })

        const breaktime = await text({
            message: "enter break duration (in mins) : ",
            placeholder : "5"
        })

        const focusDuration = parseInt(focustime)
        const breakDuration = Number(breaktime)

        if(isNaN(focusDuration)|| isNaN(breakDuration)){
            cancel("enter a valid number")
        }

        startPomodoro(focusDuration, breakDuration)
        
    }else if(command === "stats"){
        showStats()
    }else{
        console.log("something went wrong")
    }
}

main()