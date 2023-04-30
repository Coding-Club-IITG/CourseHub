import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';


class CCBranding extends StatelessWidget {
  const CCBranding({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text(
          'by',
          style: TextStyle(
              fontFamily: 'Raleway', fontWeight: FontWeight.w500, fontSize: 14) ,
        ),
        const SizedBox(
          height: 15,
        ),
        SvgPicture.asset('assets/cc_logo.svg'),
        const SizedBox(
          height: 15,
        ),
        RichText(
          textAlign: TextAlign.center,
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'Coding Club\n',
                
                style: TextStyle(
                  fontFamily: 'Raleway',
                  fontWeight: FontWeight.w700,
                  fontSize: 14
                ),
              ),
              TextSpan(
                text: 'IIT Guwahati',
                style: TextStyle(
                  fontFamily: 'Raleway',
                  fontWeight: FontWeight.w500,
                  fontSize: 14,
                ),
              )
            ],
          ),
        )
      ],
    );
  }
}
