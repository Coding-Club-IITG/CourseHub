import ImageKit from "imagekit";

const imagekit = new ImageKit({
    publicKey: "public_+YBUNGRmvTaKsBnbm1ivFykJGy0=",
    privateKey: "private_3uXXYBIXEeahWB5iO818Z6SYguQ=",
    urlEndpoint: "https://ik.imagekit.io/4d3jgzelm",
});

class notifications{
    async adminNotification(req,res,next){
        const bigPicture=req.files;
        const deviceToken="";
        const {title,body,category}=req.body;

        if(!title || !body ||!category) res.sendStatus(400);


        try{
     
            const image = await imagekit.upload({
                file: photo.buffer,
                fileName: photo.originalname,
            });

            bigPicture = image.url;
   



        }catch(e){

        }

        const json={
            "to" : "dZZxx0rqQcy1EN87Fq1Ujn:APA91bG9WDWaLNRS5kaYRgL20bEBqgb84Fr3TisioG-svcVZzyeKk2Zut37pfuxwKszJ7gD0v0Hc24PODHqXWVyWAmNX2yBeDjuQikHAVIVFXPy1BMhNqaW26_tuJNuc71xJlJaPFMMR",
            "priority": "high",
            "mutable_content": true,
            "notification": {
                "badge": 42,
                title,
                body,
            },
            "data" : {
                "content": {
                    "id": 1,
                    "badge": 1,
                    "channelKey": category,//exam,attendence,notices,schedule
                    
                    "displayOnForeground": true,
                    "notificationLayout": "BigPicture",
                    "largeIcon": "https://br.web.img3.acsta.net/pictures/19/06/18/17/09/0834720.jpg",
                    "bigPicture": "https://www.dw.com/image/49519617_303.jpg",
                    "showWhen": true,
                    "autoDismissible": true,
                    "wakeUpScreen":true,
        
                    "payload": {
                        "secret": "Awesome Notifications Rocks!"
                    }
                },
                "actionButtons": [
                    {
                        "key": "REDIRECT",
                        "label": "Redirect",
                        "autoDismissible": true
                    },
                    {
                        "key": "DISMISS",
                        "label": "Dismiss",
                        
                        "autoDismissible": true
                    }
                ]
                
                
            }
        }




    }
}

export default new notifications();