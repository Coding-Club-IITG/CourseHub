import 'package:flutter/material.dart';

Widget customAttendanceScreenButton(Function onTap, String text, Color textColor, Color backgroundColor){
  return Expanded(
    flex: 2,
    child: ElevatedButton(
      onPressed: (){onTap();},
      style: ElevatedButton.styleFrom(
          backgroundColor: backgroundColor,
          shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.zero
          )
      ),
      child: Text(text, style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.w700),),
    ),
  );
}