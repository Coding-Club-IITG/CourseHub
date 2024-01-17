import 'package:flutter/material.dart';

Future<void> showCustomTimePicker(BuildContext context){
  return showTimePicker(context: context,
    barrierColor: Colors.black,
    initialTime: TimeOfDay.now(), builder: (context, child) => Theme(
      data: ThemeData(timePickerTheme: TimePickerThemeData(
          dialHandColor: const Color.fromRGBO(49, 49, 49, 1),
          dayPeriodTextColor: const Color.fromRGBO(237, 244, 146, 1),
          dialTextStyle: const TextStyle(fontSize: 10),
          elevation: 2,
          cancelButtonStyle: ButtonStyle(
            textStyle: MaterialStateProperty.resolveWith<TextStyle>((states) => const TextStyle(color: Color.fromRGBO(237, 244, 146, 1))),),
          confirmButtonStyle: ButtonStyle(
            textStyle: MaterialStateProperty.resolveWith<TextStyle>((states) => const TextStyle(color: Color.fromRGBO(237, 244, 146, 1))),),
          dialBackgroundColor: const Color.fromRGBO(237, 244, 146, 1),
          hourMinuteColor: const Color.fromRGBO(237, 244, 146, 1),
          backgroundColor: const Color.fromRGBO(49, 49, 49, 1))),
      child: TimePickerDialog(
        initialTime: TimeOfDay.now(),
        onEntryModeChanged: (value){
          // TODO: Apply the functionality here!!
        },
      ),
    ),);
}