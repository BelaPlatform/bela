#pragma once

#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <linux/i2c-dev.h>
#include <string.h>
// heuristic to guess what version of i2c-dev.h we have:
// one would conflict with linux/i2c.h, while the other ("stock")
// one requires linux/i2c.h
#ifndef I2C_SMBUS_BLOCK_MAX
// If this is not defined, we have the "stock" i2c-dev.h
// so we include linux/i2c.h
#include <linux/i2c.h>
typedef unsigned char i2c_char_t;
#else
typedef char i2c_char_t;
#endif
#include <sys/ioctl.h>

#define MAX_BUF_NAME 64

class I2c
{

protected:
	int i2C_bus;
	int i2C_address;
	int i2C_file = 0;

public:
	int initI2C_RW(int bus, int defaultAddress, int ignored = 0);
	int closeI2C();
	int readRegisters(unsigned char address, unsigned char reg, unsigned char *inbuf, unsigned int size);
	int writeRegisters(unsigned char address, unsigned char reg, unsigned char *inbuf, unsigned int size);
	virtual ~I2c();
};


inline int I2c::initI2C_RW(int bus, int defaultAddress, int)
{
	i2C_bus = bus;
	i2C_address = defaultAddress;

	// open I2C device as a file
	char namebuf[MAX_BUF_NAME];
	snprintf(namebuf, sizeof(namebuf), "/dev/i2c-%d", i2C_bus);

	if ((i2C_file = open(namebuf, O_RDWR)) < 0)
	{
		fprintf(stderr, "Failed to open %s I2C Bus\n", namebuf);
		return(1);
	}

	// target device as slave
	// this is useless if you only use I2C_RDWR, but is needed if you use
	// write() or read()
	if (ioctl(i2C_file, I2C_SLAVE, i2C_address) < 0){
		fprintf(stderr, "I2C_SLAVE address: %d failed...\n", i2C_address);
		return 2;
	}

	return 0;
}



inline int I2c::closeI2C()
{
	if(i2C_file)
	{
		if(close(i2C_file) > 0)
		{
			fprintf(stderr, "Failed to close i2c file %d\n", i2C_file);
			return 1;
		}
	}
	i2C_file = 0;
	return 0;
}

inline I2c::~I2c()
{
	closeI2C();
}

//writeRegisters() and readRegisters(): with a little help from https://www.linuxquestions.org/questions/programming-9/reading-data-via-i2c-dev-4175499069/
//also interesting: read the source of linux/i2c-dev.h
inline int I2c::writeRegisters(
	unsigned char addr,
	unsigned char reg,
	unsigned char* values,
	unsigned int size)
{
	unsigned char outbuf[1 + size];
	struct i2c_rdwr_ioctl_data packets;
	struct i2c_msg messages[1];

	/* The first byte indicates which register we'll write */
	outbuf[0] = reg;

	/*
	* The second and successive bytes indicate the value(s) to write.
	* Note that not all devices will allow writing more than one byte.
	*/
	memcpy((void*)(outbuf + 1), (void*)values, size);

	messages[0].addr = addr;
	messages[0].flags = 0;
	messages[0].len = sizeof(outbuf);
	messages[0].buf = (char*)outbuf;

	/* Transfer the i2c packets to the kernel and verify it worked */
	packets.msgs  = messages;
	packets.nmsgs = 1;
	if(ioctl(i2C_file, I2C_RDWR, &packets) < 0) {
		return 1;
	}
	return 0;
}

inline int I2c::readRegisters(
	unsigned char addr,
	unsigned char reg,
	unsigned char *inbuf,
	unsigned int size)
{
	unsigned char outbuf[1];
	struct i2c_rdwr_ioctl_data packets;
	struct i2c_msg messages[2];

	/*
	* In order to read a register, we first do a "dummy write" by writing
	* 0 bytes to the register we want to read from.
	*/
	outbuf[0] = reg;
	messages[0].addr = addr;
	messages[0].flags = 0;
	messages[0].len = sizeof(outbuf);
	messages[0].buf = (char*)outbuf;

	/* The data will get returned in this structure */
	messages[1].addr = addr;
	messages[1].flags = I2C_M_RD;
	messages[1].len = sizeof(inbuf[0]) * size;
	messages[1].buf = (char*)inbuf;

	/* Send the request to the kernel and get the result back */
	packets.msgs = messages;
	packets.nmsgs = 2;
	if(ioctl(i2C_file, I2C_RDWR, &packets) < 0) {
		return 1;
	}
	return 0;
}
