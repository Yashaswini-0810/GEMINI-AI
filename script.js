const container=document.querySelector(".container");
const chatsContainer=document.querySelector(".chats-container");
const promptForm=document.querySelector(".prompt-form");
const promptInput=promptForm.querySelector(".prompt-input");
const fileInput=promptForm.querySelector("#file-input");
const fileUploadWrapper=promptForm.querySelector(".file-upload-wrapper");
const themeToggle=document.querySelector("#theme-toggle-btn");


// api setup
const API_KEY="AIzaSyALr52J_Pgn78Ic2jq4DZ3fGARBqXCzsgo";
const API_URL=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typinginterval, controller;
const chatHistory=[];
const userData={
        message:"",file: {}
    };

    // Function to create a message element
    const createMsgElement=(content, ...classes)=>{
        const div=document.createElement("div");
        div.classList.add("message", ...classes);
        div.innerHTML=content;
        return div;
    }
    // Function to scroll to the bottom of the chat container
    const scrollToBottom=()=>{
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
    }


    // set an interval to type each word
    const  typingEffect=(text,textElement,botMsgDiv)=>{
        textElement.textContent=""; 
        const words=text.split(" ");
        let wordIndex=0;
        // set an interval to type each word
         typinginterval=setInterval(()=>{
            if(wordIndex<words.length){
                textElement.textContent+=(wordIndex === 0 ? "":" ")+words[wordIndex++];
                // botMsgDiv.classList.remove("loading");
                scrollToBottom();
            }else{
                clearInterval(typinginterval);
                botMsgDiv.classList.remove("loading");
                document.body.classList.remove("bot-responding");
            }
        },40);
    }

    const generateResponse=async(botMsgDiv)=>{
        const textElement=botMsgDiv.querySelector(".message-text");
        controller=new AbortController();
        // add user message and file data to chat history
        chatHistory.push({
            role:"user",
            parts:[{text: userMessage}, ...(userData.file.data? [{inline_data: (({fileName, isImage, ...rest})=>rest)(userData.file) }] : [])]
        });
        try{
            const respones=await fetch(API_URL,{
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    contents:chatHistory}), 
                signal: controller.signal
            });
            const data=await respones.json();
            if(!respones.ok) throw new Error(data.error.message);

            // process the response text and display with typing effect
            const responseText=data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
            typingEffect(responseText,textElement,botMsgDiv);
            chatHistory.push({
                role:"model",
                parts:[{text: responseText}]
            });
            console.log(chatHistory);

        }catch(error){
            textElement.style.color="#d62939"; // set error text color
            textElement.textContent=error.name === "AbortError" ? "Response generation stopped." : error.message;
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }finally{
            userData.file={};
        }
    }

    // handle the form submission
    const handlerFormSubmit=(e)=>{
        e.preventDefault();
        userMessage=promptInput.value.trim();
        if(!userMessage || document.body.classList.contains("bot-responding")) return;

        promptInput.value=""; // clear the input field
        userData.message=userMessage;
        document.body.classList.add("bot-responding","chats-active");
        fileUploadWrapper.classList.remove("active","img-attached", "file-attached");

        //GENERATE USER MESSAGE 
        const userMsgHTML= `
            <p class="message-text"></p>
        ${userData.file.data ? (userData.file.isImage ? `
        <img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="image-attachment" />` : `<p class="file-attachment">
        <span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}`;

        const userMsgDiv=createMsgElement(userMsgHTML,"user-message")
        userMsgDiv.querySelector(".message-text").textContent=userMessage;
        chatsContainer.appendChild(userMsgDiv);
        scrollToBottom(); // scroll to the bottom of the chat container
        //console.log("User message:", userMessage);

        setTimeout(()=>{
            // generate bot message html and add it to the chat container after 600ms
            const botMsgHTML=`<img src="gemini.svg" class="avatar"><p class="message-text">Just a sec...</p>`;
            const botMsgDiv=createMsgElement(botMsgHTML,"bot-message","loading");
            chatsContainer.appendChild(botMsgDiv);
            scrollToBottom(); // scroll to the bottom of the chat container
            generateResponse(botMsgDiv);
    },600);
}
    // handle file input change(file upload)
    fileInput.addEventListener("change",()=>{
        const file=fileInput.files[0];
        if(!file) return;

        const isImage=file.type.startsWith("image/");
        const reader =new FileReader();
        reader.readAsDataURL(file);

        reader.onload=(e)=>{
            fileInput.value="";
            const base64String=e.target.result.split(",")[1];
            fileUploadWrapper.querySelector(".file-preview").src=e.target.result;
            fileUploadWrapper.classList.add("active", isImage ? "img-attached":"file-attached");

            // store file data in userSta obj
            userData.file={ fileName: file.name, data: base64String, mime_type:file.type,isImage }
        }
    });

    // cancel file upload
    document.querySelector("#cancel-file-btn").addEventListener("click",()=>{
        userData.file={};
        fileUploadWrapper.classList.remove("active","img-attached", "file-attached");
    });
    // stop ongoing bot response
    document.querySelector("#stop-response-btn").addEventListener("click",()=>{
        userData.file={};
        controller?.abort(); // abort the fetch request if in progress
        clearInterval(typinginterval); // clear the typing effect interval
        chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
        document.body.classList.remove("bot-responding");
    });
     // delete all chats
    document.querySelector("#delete-chats-btn").addEventListener("click",()=>{
        chatHistory.length=0; // clear chat history
        chatsContainer.innerHTML=""; // clear the chat container
        document.body.classList.remove("bot-responding","chats-active");
    });


    // handle suggestion item click
    document.querySelectorAll(".suggestions-item").forEach(item=>{
        item.addEventListener("click",()=>{
            promptInput.value=item.querySelector(".txt").textContent;
            promptForm.dispatchEvent(new Event("submit")); // trigger form submit
    });
});


    // Show/hide controls for mobile on prompt input focus
    document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains
    ("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
    });


    // toggle dark/light theme
        themeToggle.addEventListener("click",()=>{
        const isLightTheme=document.body.classList.toggle("light-theme");
        localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
        themeToggle.textContent= isLightTheme ? "dark_mode" : "light_mode";
    });

        const isLightTheme=localStorage.getItem("themeColor") === "light_mode";
        document.body.classList.toggle("light-theme", isLightTheme);
        themeToggle.textContent= isLightTheme ? "dark_mode" : "light_mode";

    promptForm.addEventListener("submit", handlerFormSubmit);
    promptForm.querySelector("#add-file-btn").addEventListener("click",()=>fileInput.click());
