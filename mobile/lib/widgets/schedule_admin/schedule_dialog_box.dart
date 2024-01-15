import 'package:flutter/material.dart';

import 'custom_dialog_button.dart';

Future<void> showScheduleDialogBox(BuildContext context, Widget actions, Function cancelOnTap, Function confirmOnTap)async{
  return showDialog(context: context, barrierDismissible:false, builder: (context){
    return AlertDialog(
      actionsPadding: const EdgeInsets.all(10),
      backgroundColor: const Color.fromRGBO(49, 49, 49, 1),
      actionsAlignment: MainAxisAlignment.end,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
      actions: [
        actions,
        const SizedBox(height: 25,),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            customAttendanceScreenButton(cancelOnTap, 'Cancel', const Color.fromRGBO(237, 244, 146, 1), const Color.fromRGBO(49, 49, 49, 1)),
            const SizedBox(width: 10,),
            customAttendanceScreenButton(confirmOnTap, 'Confirm', Colors.black, const Color.fromRGBO(237, 244, 146, 1)),
          ],
        )
      ],
    );
  });
}